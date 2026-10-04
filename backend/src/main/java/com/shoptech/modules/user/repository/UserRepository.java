package com.shoptech.modules.user.repository;

import com.shoptech.modules.user.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    Optional<User> findByUsername(String username);

    boolean existsByUsername(String username);

    boolean existsByEmail(String email);

    boolean existsByUsernameAndIdNot(String username, Long id);

    boolean existsByEmailAndIdNot(String email, Long id);

    @Query("""
            select u from User u
            where u.role = :role
              and (:search is null
                   or u.name like concat('%', :search, '%')
                   or u.username like concat('%', :search, '%')
                   or u.email like concat('%', :search, '%')
                   or u.phone like concat('%', :search, '%'))
            """)
    Page<User> searchByRole(@Param("role") String role, @Param("search") String search, Pageable pageable);
}
