package com.shoptech.common.storage;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.shoptech.config.AppProperties;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/** Upload ảnh lên Cloudinary (cấu hình qua CLOUDINARY_URL). */
@Service
public class CloudinaryService {

    public static final String DEFAULT_FOLDER = "thumbnail-shoptech";

    private final Cloudinary cloudinary;

    public CloudinaryService(AppProperties props) {
        String url = props.cloudinaryUrl();
        this.cloudinary = url == null || url.isBlank() ? null : new Cloudinary(url);
    }

    public String uploadImage(MultipartFile file, String folder) {
        if (cloudinary == null) {
            throw new IllegalStateException("Chưa cấu hình CLOUDINARY_URL");
        }
        try {
            Map<?, ?> result = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.asMap("asset_folder", folder));
            return (String) result.get("secure_url");
        } catch (IOException e) {
            throw new UncheckedIOException("Upload ảnh thất bại", e);
        }
    }

    /** Tệp không phải ảnh (pdf, doc, zip...) — lưu dạng raw, giữ phần đuôi để tải về mở được. */
    public String uploadFile(MultipartFile file, String folder) {
        if (cloudinary == null) {
            throw new IllegalStateException("Chưa cấu hình CLOUDINARY_URL");
        }
        try {
            String name = file.getOriginalFilename() == null ? "" : file.getOriginalFilename();
            Map<?, ?> result = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.asMap(
                    "asset_folder", folder, "resource_type", "raw", "use_filename", true, "unique_filename", true,
                    "filename_override", name));
            return (String) result.get("secure_url");
        } catch (IOException e) {
            throw new UncheckedIOException("Upload tệp thất bại", e);
        }
    }

    public String uploadImage(MultipartFile file) {
        return uploadImage(file, DEFAULT_FOLDER);
    }

    public List<String> uploadImages(List<MultipartFile> files) {
        List<String> urls = new ArrayList<>();
        for (MultipartFile f : files) {
            urls.add(uploadImage(f, DEFAULT_FOLDER));
        }
        return urls;
    }
}
