package com.shoptech.modules.customer.service;

import com.shoptech.common.exception.ApiException;
import com.shoptech.common.exception.RequestValidator;
import com.shoptech.common.exception.Validator;
import com.shoptech.modules.customer.dto.AddressRequest;
import com.shoptech.modules.customer.entity.Address;
import com.shoptech.modules.customer.repository.AddressRepository;
import com.shoptech.modules.location.service.LocationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/** Sổ địa chỉ nhận hàng của khách (mã tỉnh/quận/phường theo danh mục GHN). Luôn có đúng một địa chỉ mặc định. */
@Service
@RequiredArgsConstructor
public class AddressService {

    private static final String LOCATION_MISMATCH =
            "Quận/huyện hoặc phường/xã không thuộc tỉnh/thành phố đã chọn, hoặc không tồn tại.";

    private final AddressRepository addressRepository;
    private final LocationService locationService;
    private final RequestValidator requestValidator;

    /** Mặc định lên đầu, còn lại mới nhất trước. */
    @Transactional(readOnly = true)
    public List<Address> list(Long userId) {
        return addressRepository.findByUserId(userId).stream()
                .sorted(Comparator.comparing(Address::isDefaultAddress).reversed()
                        .thenComparing(Address::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(Address::getId, Comparator.reverseOrder()))
                .toList();
    }

    @Transactional
    public Address create(Long userId, AddressRequest request) {
        validate(request, AddressRequest.OnCreate.class);

        Address address = new Address();
        address.setUserId(userId);
        address.setRecipientName(request.recipientName().trim());
        address.setPhone(request.phone());
        address.setAddressLine(request.addressLine().trim());
        applyLocation(address, request.provinceId(), request.districtId(), request.wardCode());
        // Địa chỉ đầu tiên luôn là mặc định.
        boolean makeDefault = Boolean.TRUE.equals(request.isDefault()) || addressRepository.findByUserId(userId).isEmpty();
        address.setDefaultAddress(makeDefault);
        address.setCreatedAt(Instant.now());
        address.setUpdatedAt(address.getCreatedAt());
        addressRepository.saveAndFlush(address);

        if (makeDefault) {
            markAsOnlyDefault(userId, address);
        }
        return address;
    }

    @Transactional
    public Address update(Long userId, Long id, AddressRequest request) {
        Address address = owned(userId, id);
        validate(request);

        if (request.recipientName() != null) {
            address.setRecipientName(request.recipientName().trim());
        }
        if (request.phone() != null) {
            address.setPhone(request.phone());
        }
        if (request.addressLine() != null) {
            address.setAddressLine(request.addressLine().trim());
        }
        if (request.provinceId() != null || request.districtId() != null || request.wardCode() != null) {
            applyLocation(address,
                    request.provinceId() != null ? request.provinceId() : address.getProvinceIdGhn(),
                    request.districtId() != null ? request.districtId() : address.getDistrictId(),
                    request.wardCode() != null ? request.wardCode() : address.getWardCodeGhn());
        }
        boolean makeDefault = Boolean.TRUE.equals(request.isDefault());
        if (makeDefault) {
            address.setDefaultAddress(true);
        }
        address.setUpdatedAt(Instant.now());
        addressRepository.save(address);

        if (makeDefault) {
            markAsOnlyDefault(userId, address);
        }
        return address;
    }

    /** Xoá địa chỉ mặc định thì địa chỉ mới nhất còn lại trở thành mặc định. */
    @Transactional
    public void delete(Long userId, Long id) {
        Address address = owned(userId, id);
        boolean wasDefault = address.isDefaultAddress();
        addressRepository.delete(address);
        addressRepository.flush();

        if (wasDefault) {
            addressRepository.findByUserId(userId).stream()
                    .max(Comparator.comparing(Address::getCreatedAt, Comparator.nullsFirst(Comparator.naturalOrder()))
                            .thenComparing(Address::getId))
                    .ifPresent(next -> {
                        next.setDefaultAddress(true);
                        next.setUpdatedAt(Instant.now());
                        addressRepository.save(next);
                    });
        }
    }

    @Transactional
    public Address setDefault(Long userId, Long id) {
        Address address = owned(userId, id);
        address.setDefaultAddress(true);
        address.setUpdatedAt(Instant.now());
        addressRepository.save(address);
        markAsOnlyDefault(userId, address);
        return address;
    }

    // ------------------------------------------------------------------ helpers

    private void validate(AddressRequest request, Class<?>... groups) {
        Validator v = requestValidator.validate(request, groups);
        v.throwIfFailed();
    }

    /** Mã quận/phường phải thuộc đúng tỉnh/quận đã chọn theo danh mục GHN; lưu kèm tên để hiển thị. */
    private void applyLocation(Address address, Long provinceId, Long districtId, String wardCode) {
        Map<String, Object> province = provinceId == null ? null : locationService.findProvince(provinceId);
        Map<String, Object> district = province == null || districtId == null ? null
                : locationService.findDistrict(provinceId, districtId);
        Map<String, Object> ward = district == null || wardCode == null ? null
                : locationService.findWard(districtId, wardCode);
        if (ward == null) {
            throw ApiException.unprocessable(LOCATION_MISMATCH);
        }
        address.setProvinceIdGhn(provinceId);
        address.setProvinceNameGhn(String.valueOf(province.get("ProvinceName")));
        address.setDistrictId(districtId);
        address.setDistrictName(String.valueOf(district.get("DistrictName")));
        address.setWardCodeGhn(wardCode);
        address.setWardNameGhn(String.valueOf(ward.get("WardName")));
    }

    private void markAsOnlyDefault(Long userId, Address keep) {
        addressRepository.findByUserId(userId).stream()
                .filter(a -> !Objects.equals(a.getId(), keep.getId()) && a.isDefaultAddress())
                .forEach(a -> {
                    a.setDefaultAddress(false);
                    a.setUpdatedAt(Instant.now());
                    addressRepository.save(a);
                });
    }

    private Address owned(Long userId, Long id) {
        Address address = addressRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy địa chỉ"));
        if (!Objects.equals(address.getUserId(), userId)) {
            throw ApiException.forbidden("Không có quyền với địa chỉ này");
        }
        return address;
    }
}
