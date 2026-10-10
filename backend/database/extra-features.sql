-- ShopTech — bổ sung schema cho các chức năng: voucher, trả góp, thu cũ đổi mới và affiliate theo gian hàng,
-- ShopTech Xu, danh sách yêu thích, chat. Chạy MỘT LẦN trên database hiện có (các bảng gốc nhập từ file SQL ban đầu).
-- Phần 1: thêm cột vào bảng sẵn có. Phần 2: tạo bảng mới (CREATE TABLE IF NOT EXISTS nên chạy lại không lỗi).

-- ---------------------------------------------------------------- Phần 1: bảng sẵn có

ALTER TABLE users
    ADD COLUMN xu_balance INT UNSIGNED NOT NULL DEFAULT 0,
    ADD COLUMN referral_code VARCHAR(12) NULL,
    ADD COLUMN referred_by BIGINT UNSIGNED NULL,
    ADD UNIQUE KEY users_referral_code_unique (referral_code),
    ADD CONSTRAINT users_referred_by_foreign FOREIGN KEY (referred_by) REFERENCES users (id) ON DELETE SET NULL;

ALTER TABLE coupons
    ADD COLUMN new_customer_only TINYINT(1) NOT NULL DEFAULT 0,
    ADD COLUMN weekday TINYINT UNSIGNED NULL,
    ADD COLUMN daily_limit INT UNSIGNED NULL,
    ADD COLUMN user_id BIGINT UNSIGNED NULL,
    ADD COLUMN trade_in_request_id BIGINT UNSIGNED NULL,
    ADD COLUMN store_id BIGINT UNSIGNED NULL,
    ADD KEY coupons_user_id_index (user_id),
    ADD KEY coupons_trade_in_request_id_index (trade_in_request_id),
    ADD KEY coupons_store_id_index (store_id);

ALTER TABLE orders
    ADD COLUMN xu_used INT UNSIGNED NOT NULL DEFAULT 0,
    MODIFY COLUMN payment_method VARCHAR(20) NOT NULL DEFAULT 'cod';

ALTER TABLE seller_orders
    ADD COLUMN store_discount DECIMAL(15,2) NOT NULL DEFAULT 0,
    ADD COLUMN store_shipping_subsidy DECIMAL(15,2) NOT NULL DEFAULT 0;

ALTER TABLE order_items
    ADD COLUMN affiliate_referrer_id BIGINT UNSIGNED NULL,
    ADD COLUMN affiliate_rate DECIMAL(5,2) NULL,
    ADD KEY order_items_affiliate_referrer_id_index (affiliate_referrer_id);

-- ---------------------------------------------------------------- Phần 2: bảng mới

CREATE TABLE IF NOT EXISTS `product_affiliates` (
 `id` bigint unsigned NOT NULL AUTO_INCREMENT,
 `product_id` bigint unsigned NOT NULL,
 `store_id` bigint unsigned NOT NULL,
 `rate` decimal(5,2) NOT NULL,
 `enabled` tinyint(1) NOT NULL DEFAULT '1',
 `created_at` timestamp NULL DEFAULT NULL,
 `updated_at` timestamp NULL DEFAULT NULL,
 PRIMARY KEY (`id`),
 UNIQUE KEY `product_affiliates_product_id_unique` (`product_id`),
 KEY `product_affiliates_store_id_index` (`store_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `store_affiliate_settings` (
 `id` bigint unsigned NOT NULL AUTO_INCREMENT,
 `store_id` bigint unsigned NOT NULL,
 `enabled` tinyint(1) NOT NULL DEFAULT '0',
 `rate` decimal(5,2) NOT NULL DEFAULT '2.00',
 `hold_days` smallint unsigned NOT NULL DEFAULT '7',
 `min_withdrawal` int unsigned NOT NULL DEFAULT '50000',
 `created_at` timestamp NULL DEFAULT NULL,
 `updated_at` timestamp NULL DEFAULT NULL,
 PRIMARY KEY (`id`),
 UNIQUE KEY `store_affiliate_settings_store_id_unique` (`store_id`),
 CONSTRAINT `store_affiliate_settings_store_id_foreign` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `affiliate_commissions` (
 `id` bigint unsigned NOT NULL AUTO_INCREMENT,
 `referrer_id` bigint unsigned NOT NULL,
 `referred_user_id` bigint unsigned NOT NULL,
 `store_id` bigint unsigned DEFAULT NULL,
 `seller_order_id` bigint unsigned NOT NULL,
 `order_amount` decimal(15,2) NOT NULL,
 `rate` decimal(5,2) NOT NULL,
 `amount` decimal(15,2) NOT NULL,
 `status` enum('pending','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
 `available_at` timestamp NOT NULL,
 `created_at` timestamp NULL DEFAULT NULL,
 `updated_at` timestamp NULL DEFAULT NULL,
 PRIMARY KEY (`id`),
 UNIQUE KEY `affiliate_commissions_order_referrer_unique` (`seller_order_id`,`referrer_id`),
 KEY `affiliate_commissions_referred_user_id_foreign` (`referred_user_id`),
 KEY `affiliate_commissions_referrer_id_status_index` (`referrer_id`,`status`),
 KEY `affiliate_commissions_store_id_foreign` (`store_id`),
 CONSTRAINT `affiliate_commissions_referred_user_id_foreign` FOREIGN KEY (`referred_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
 CONSTRAINT `affiliate_commissions_referrer_id_foreign` FOREIGN KEY (`referrer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
 CONSTRAINT `affiliate_commissions_seller_order_id_foreign` FOREIGN KEY (`seller_order_id`) REFERENCES `seller_orders` (`id`) ON DELETE CASCADE,
 CONSTRAINT `affiliate_commissions_store_id_foreign` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `affiliate_withdrawals` (
 `id` bigint unsigned NOT NULL AUTO_INCREMENT,
 `user_id` bigint unsigned NOT NULL,
 `store_id` bigint unsigned DEFAULT NULL,
 `amount` decimal(15,2) NOT NULL,
 `bank_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
 `bank_account` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
 `account_holder` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
 `status` enum('pending','approved','rejected') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
 `note` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
 `reviewed_by` bigint unsigned DEFAULT NULL,
 `reviewed_at` timestamp NULL DEFAULT NULL,
 `created_at` timestamp NULL DEFAULT NULL,
 `updated_at` timestamp NULL DEFAULT NULL,
 `payout_reference` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
 PRIMARY KEY (`id`),
 KEY `affiliate_withdrawals_reviewed_by_foreign` (`reviewed_by`),
 KEY `affiliate_withdrawals_user_id_status_index` (`user_id`,`status`),
 KEY `affiliate_withdrawals_store_id_foreign` (`store_id`),
 CONSTRAINT `affiliate_withdrawals_reviewed_by_foreign` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
 CONSTRAINT `affiliate_withdrawals_store_id_foreign` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE SET NULL,
 CONSTRAINT `affiliate_withdrawals_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `wishlists` (
 `id` bigint unsigned NOT NULL AUTO_INCREMENT,
 `user_id` bigint unsigned NOT NULL,
 `product_id` int NOT NULL,
 `target_price` decimal(15,2) DEFAULT NULL,
 `last_notified_price` decimal(15,2) DEFAULT NULL,
 `created_at` timestamp NULL DEFAULT NULL,
 `updated_at` timestamp NULL DEFAULT NULL,
 PRIMARY KEY (`id`),
 UNIQUE KEY `wishlists_user_id_product_id_unique` (`user_id`,`product_id`),
 KEY `wishlists_product_id_foreign` (`product_id`),
 CONSTRAINT `wishlists_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
 CONSTRAINT `wishlists_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `xu_transactions` (
 `id` bigint unsigned NOT NULL AUTO_INCREMENT,
 `user_id` bigint unsigned NOT NULL,
 `type` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
 `amount` int NOT NULL,
 `balance_after` int unsigned NOT NULL,
 `reference_type` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
 `reference_id` bigint unsigned DEFAULT NULL,
 `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
 `created_at` timestamp NULL DEFAULT NULL,
 `updated_at` timestamp NULL DEFAULT NULL,
 PRIMARY KEY (`id`),
 UNIQUE KEY `xu_transactions_unique_ref` (`user_id`,`type`,`reference_type`,`reference_id`),
 CONSTRAINT `xu_transactions_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `daily_checkins` (
 `id` bigint unsigned NOT NULL AUTO_INCREMENT,
 `user_id` bigint unsigned NOT NULL,
 `checkin_date` date NOT NULL,
 `streak` int unsigned NOT NULL,
 `xu_earned` int unsigned NOT NULL,
 `created_at` timestamp NULL DEFAULT NULL,
 `updated_at` timestamp NULL DEFAULT NULL,
 PRIMARY KEY (`id`),
 UNIQUE KEY `daily_checkins_user_id_checkin_date_unique` (`user_id`,`checkin_date`),
 CONSTRAINT `daily_checkins_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `store_installment_settings` (
 `id` bigint unsigned NOT NULL AUTO_INCREMENT,
 `store_id` bigint unsigned NOT NULL,
 `enabled` tinyint(1) NOT NULL DEFAULT '0',
 `min_order` decimal(15,2) NOT NULL DEFAULT '3000000.00',
 `terms` json NOT NULL,
 `created_at` timestamp NULL DEFAULT NULL,
 `updated_at` timestamp NULL DEFAULT NULL,
 PRIMARY KEY (`id`),
 UNIQUE KEY `store_installment_settings_store_id_unique` (`store_id`),
 CONSTRAINT `store_installment_settings_store_id_foreign` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `installment_plans` (
 `id` bigint unsigned NOT NULL AUTO_INCREMENT,
 `order_id` bigint unsigned NOT NULL,
 `user_id` bigint unsigned NOT NULL,
 `store_id` bigint unsigned DEFAULT NULL,
 `seller_order_id` bigint unsigned DEFAULT NULL,
 `principal` decimal(15,2) NOT NULL,
 `months` tinyint unsigned NOT NULL,
 `monthly_rate` decimal(5,2) NOT NULL,
 `total_interest` decimal(15,2) NOT NULL,
 `total_payable` decimal(15,2) NOT NULL,
 `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending_approval',
 `created_at` timestamp NULL DEFAULT NULL,
 `updated_at` timestamp NULL DEFAULT NULL,
 `decided_at` timestamp NULL DEFAULT NULL,
 `decision_note` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
 PRIMARY KEY (`id`),
 UNIQUE KEY `installment_plans_order_id_unique` (`order_id`),
 KEY `installment_plans_user_id_status_index` (`user_id`,`status`),
 KEY `installment_plans_store_id_foreign` (`store_id`),
 KEY `installment_plans_seller_order_id_index` (`seller_order_id`),
 CONSTRAINT `installment_plans_order_id_foreign` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
 CONSTRAINT `installment_plans_store_id_foreign` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE SET NULL,
 CONSTRAINT `installment_plans_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `installment_payments` (
 `id` bigint unsigned NOT NULL AUTO_INCREMENT,
 `plan_id` bigint unsigned NOT NULL,
 `number` tinyint unsigned NOT NULL,
 `amount` decimal(15,2) NOT NULL,
 `principal_part` decimal(15,2) NOT NULL,
 `interest_part` decimal(15,2) NOT NULL,
 `due_date` date NOT NULL,
 `status` enum('pending','paid','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
 `paid_at` timestamp NULL DEFAULT NULL,
 `payment_ref` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
 `reminded_at` timestamp NULL DEFAULT NULL,
 `created_at` timestamp NULL DEFAULT NULL,
 `updated_at` timestamp NULL DEFAULT NULL,
 PRIMARY KEY (`id`),
 UNIQUE KEY `installment_payments_plan_id_number_unique` (`plan_id`,`number`),
 KEY `installment_payments_status_due_date_index` (`status`,`due_date`),
 KEY `installment_payments_payment_ref_index` (`payment_ref`),
 CONSTRAINT `installment_payments_plan_id_foreign` FOREIGN KEY (`plan_id`) REFERENCES `installment_plans` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `chat_conversations` (
 `id` bigint unsigned NOT NULL AUTO_INCREMENT,
 `user_id` bigint unsigned NOT NULL,
 `store_id` bigint unsigned DEFAULT NULL,
 `last_message_at` timestamp NULL DEFAULT NULL,
 `last_message_preview` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
 `customer_unread` int unsigned NOT NULL DEFAULT '0',
 `store_unread` int unsigned NOT NULL DEFAULT '0',
 `created_at` timestamp NULL DEFAULT NULL,
 `updated_at` timestamp NULL DEFAULT NULL,
 PRIMARY KEY (`id`),
 UNIQUE KEY `chat_conversations_user_id_store_id_unique` (`user_id`,`store_id`),
 KEY `chat_conversations_store_id_last_message_at_index` (`store_id`,`last_message_at`),
 CONSTRAINT `chat_conversations_store_id_foreign` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE,
 CONSTRAINT `chat_conversations_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `chat_messages` (
 `id` bigint unsigned NOT NULL AUTO_INCREMENT,
 `conversation_id` bigint unsigned NOT NULL,
 `sender_type` enum('customer','store') COLLATE utf8mb4_unicode_ci NOT NULL,
 `sender_id` bigint unsigned NOT NULL,
 `body` text COLLATE utf8mb4_unicode_ci,
 `product_id` int DEFAULT NULL,
 `created_at` timestamp NULL DEFAULT NULL,
 `updated_at` timestamp NULL DEFAULT NULL,
 `attachments` json DEFAULT NULL,
 PRIMARY KEY (`id`),
 KEY `chat_messages_sender_id_foreign` (`sender_id`),
 KEY `chat_messages_conversation_id_id_index` (`conversation_id`,`id`),
 CONSTRAINT `chat_messages_conversation_id_foreign` FOREIGN KEY (`conversation_id`) REFERENCES `chat_conversations` (`id`) ON DELETE CASCADE,
 CONSTRAINT `chat_messages_sender_id_foreign` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `trade_in_models` (
 `id` bigint unsigned NOT NULL AUTO_INCREMENT,
 `store_id` bigint unsigned DEFAULT NULL,
 `category` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
 `brand` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
 `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
 `base_price` decimal(15,2) NOT NULL,
 `is_active` tinyint(1) NOT NULL DEFAULT '1',
 `created_at` timestamp NULL DEFAULT NULL,
 `updated_at` timestamp NULL DEFAULT NULL,
 PRIMARY KEY (`id`),
 KEY `trade_in_models_category_is_active_index` (`category`,`is_active`),
 KEY `trade_in_models_store_id_foreign` (`store_id`),
 CONSTRAINT `trade_in_models_store_id_foreign` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `trade_in_requests` (
 `id` bigint unsigned NOT NULL AUTO_INCREMENT,
 `user_id` bigint unsigned NOT NULL,
 `store_id` bigint unsigned DEFAULT NULL,
 `trade_in_model_id` bigint unsigned DEFAULT NULL,
 `model_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
 `condition` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
 `has_box` tinyint(1) NOT NULL DEFAULT '0',
 `has_charger` tinyint(1) NOT NULL DEFAULT '0',
 `description` text COLLATE utf8mb4_unicode_ci,
 `images` json DEFAULT NULL,
 `estimated_price` decimal(15,2) NOT NULL,
 `final_price` decimal(15,2) DEFAULT NULL,
 `status` enum('pending','approved','rejected','used') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
 `admin_note` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
 `reviewed_by` bigint unsigned DEFAULT NULL,
 `reviewed_at` timestamp NULL DEFAULT NULL,
 `coupon_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
 `used_order_id` bigint unsigned DEFAULT NULL,
 `created_at` timestamp NULL DEFAULT NULL,
 `updated_at` timestamp NULL DEFAULT NULL,
 PRIMARY KEY (`id`),
 KEY `trade_in_requests_trade_in_model_id_foreign` (`trade_in_model_id`),
 KEY `trade_in_requests_reviewed_by_foreign` (`reviewed_by`),
 KEY `trade_in_requests_user_id_status_index` (`user_id`,`status`),
 KEY `trade_in_requests_store_id_foreign` (`store_id`),
 CONSTRAINT `trade_in_requests_reviewed_by_foreign` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
 CONSTRAINT `trade_in_requests_store_id_foreign` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE SET NULL,
 CONSTRAINT `trade_in_requests_trade_in_model_id_foreign` FOREIGN KEY (`trade_in_model_id`) REFERENCES `trade_in_models` (`id`) ON DELETE SET NULL,
 CONSTRAINT `trade_in_requests_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
