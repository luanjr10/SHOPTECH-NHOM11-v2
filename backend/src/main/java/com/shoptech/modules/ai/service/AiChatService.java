package com.shoptech.modules.ai.service;

import com.shoptech.common.util.Json;
import com.shoptech.modules.ai.dto.AiChatProduct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Trợ lý AI tư vấn bán hàng (Groq — API tương thích OpenAI). Model được cấp tool "search_products"
 * để luôn lấy tên / giá / tồn kho thật từ database thay vì tự bịa.
 */
@Slf4j
@Service
public class AiChatService {

    private static final String ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
    private static final int MAX_HISTORY = 12;
    private static final int MAX_TOOL_ROUNDS = 3;

    private static final String SYSTEM_PROMPT = """
            Bạn là trợ lý AI tư vấn bán hàng của ShopTech — sàn thương mại điện tử chuyên đồ công nghệ
            (điện thoại, laptop, đồng hồ thông minh, phụ kiện...) với nhiều gian hàng (store) khác nhau.

            Nhiệm vụ:
            - Tư vấn sản phẩm phù hợp nhu cầu/ngân sách khách hàng.
            - Giải đáp thắc mắc chung về mua sắm, vận chuyển (giao hàng COD, ước tính phí/ngày nhận),
              thanh toán (MoMo, VNPay, COD), đổi trả, mã giảm giá, chính sách gian hàng.
            - Khi khách hỏi về sản phẩm cụ thể (tên, giá, có hàng không, gợi ý sản phẩm...), LUÔN gọi
              tool `search_products` để lấy dữ liệu thật — TUYỆT ĐỐI KHÔNG tự bịa tên sản phẩm, giá, hay
              tình trạng kho. Tool chỉ trả tên, giá, danh mục, thương hiệu, tồn kho: KHÔNG tự thêm thông số
              kỹ thuật (CPU, RAM, dung lượng, màn hình...) không có trong kết quả.
            - Nếu tool không trả về kết quả phù hợp, thành thật nói chưa tìm thấy và gợi ý khách thử
              từ khoá khác, không bịa sản phẩm.
            - Trả lời ngắn gọn, thân thiện, đúng trọng tâm, bằng tiếng Việt. Có thể dùng danh sách gạch
              đầu dòng khi liệt kê nhiều lựa chọn.
            - Không tư vấn ngoài phạm vi mua sắm/công nghệ (không đưa lời khuyên y tế, pháp lý, tài chính...).
            """;

    private final AiProductSearch productSearch;
    private final Json json;
    private final String apiKey;
    private final String model;
    private final RestClient restClient = RestClient.create();

    public AiChatService(AiProductSearch productSearch, Json json,
                         @Value("${app.ai.groq.api-key:}") String apiKey,
                         @Value("${app.ai.groq.model:openai/gpt-oss-120b}") String model) {
        this.productSearch = productSearch;
        this.json = json;
        this.apiKey = apiKey;
        this.model = model;
    }

    public record Reply(String reply, List<AiChatProduct> products) {
    }

    public record Message(String role, String content) {
    }

    public Reply respond(List<Message> history) {
        if (apiKey == null || apiKey.isBlank()) {
            return new Reply("Trợ lý AI hiện chưa được cấu hình (thiếu GROQ_API_KEY). "
                    + "Vui lòng liên hệ shop qua hotline để được hỗ trợ.", List.of());
        }

        List<Map<String, Object>> messages = new ArrayList<>();
        messages.add(Map.of("role", "system", "content", SYSTEM_PROMPT));
        history.stream().skip(Math.max(0, history.size() - MAX_HISTORY))
                .forEach(m -> messages.add(Map.of("role", m.role(), "content", m.content())));

        List<AiChatProduct> lastProducts = List.of();
        for (int round = 0; round < MAX_TOOL_ROUNDS; round++) {
            Map<String, Object> message;
            try {
                message = complete(messages);
            } catch (RestClientException | IllegalStateException e) {
                log.error("AI chat: lỗi gọi Groq: {}", e.getMessage());
                return new Reply("Xin lỗi, trợ lý AI đang gặp sự cố kết nối. Bạn thử lại sau ít phút nhé.", List.of());
            }

            Object toolCalls = message.get("tool_calls");
            if (!(toolCalls instanceof List<?> calls) || calls.isEmpty()) {
                Object content = message.get("content");
                String reply = content == null || content.toString().isBlank()
                        ? "Xin lỗi, tôi chưa có câu trả lời phù hợp." : content.toString().trim();
                return new Reply(reply, lastProducts);
            }

            Map<String, Object> assistant = new LinkedHashMap<>();
            assistant.put("role", "assistant");
            assistant.put("content", message.get("content"));
            assistant.put("tool_calls", calls);
            messages.add(assistant);

            for (Object call : calls) {
                Map<?, ?> toolCall = (Map<?, ?>) call;
                Map<?, ?> function = (Map<?, ?>) toolCall.get("function");
                Object parsed = json.parse(function == null ? "{}" : String.valueOf(function.get("arguments")));
                @SuppressWarnings("unchecked")
                Map<String, Object> args = parsed instanceof Map<?, ?> m ? (Map<String, Object>) m : Map.of();

                List<AiChatProduct> results = productSearch.search(args);
                log.debug("AI search_products {} -> {} kết quả", args, results.size());
                if (!results.isEmpty()) {
                    lastProducts = results;
                }
                messages.add(Map.of(
                        "role", "tool",
                        "tool_call_id", String.valueOf(toolCall.get("id")),
                        "content", json.write(Map.of(
                                "count", results.size(),
                                "products", results.stream().map(p -> {
                                    Map<String, Object> row = new LinkedHashMap<>();
                                    row.put("name", p.name());
                                    row.put("price", p.finalPrice());
                                    row.put("category", p.category());
                                    row.put("brand", p.brand());
                                    row.put("stock", p.stock());
                                    return row;
                                }).toList()))));
            }
        }
        return new Reply("Mình cần thêm thông tin để tư vấn chính xác hơn — bạn mô tả rõ hơn nhu cầu/ngân sách giúp mình nhé!",
                lastProducts);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> complete(List<Map<String, Object>> messages) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", model);
        body.put("messages", messages);
        body.put("tools", List.of(searchProductsTool()));
        body.put("temperature", 0.4);

        Map<String, Object> response = restClient.post().uri(ENDPOINT)
                .header("Authorization", "Bearer " + apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(new ParameterizedTypeReference<>() {
                });
        Object choices = response == null ? null : response.get("choices");
        if (!(choices instanceof List<?> list) || list.isEmpty()) {
            throw new IllegalStateException("Groq không trả về kết quả");
        }
        return (Map<String, Object>) ((Map<?, ?>) list.get(0)).get("message");
    }

    private static Map<String, Object> searchProductsTool() {
        Map<String, Object> props = new LinkedHashMap<>();
        props.put("query", Map.of("type", "string",
                "description", "Từ khoá tìm theo tên sản phẩm, VD \"iphone 15\", \"laptop gaming\"."));
        props.put("category", Map.of("type", "string", "description", "Tên danh mục, VD \"Điện thoại\", \"Laptop\"."));
        props.put("brand", Map.of("type", "string", "description", "Tên thương hiệu, VD \"Apple\", \"Samsung\"."));
        props.put("min_price", Map.of("type", "number", "description", "Giá tối thiểu (VNĐ)."));
        props.put("max_price", Map.of("type", "number", "description", "Giá tối đa (VNĐ)."));
        props.put("sort", Map.of("type", "string", "enum", List.of("price_asc", "price_desc", "newest"),
                "description", "Cách sắp xếp kết quả."));
        props.put("limit", Map.of("type", "integer", "description", "Số lượng kết quả tối đa (mặc định 5, tối đa 8)."));
        return Map.of("type", "function", "function", Map.of(
                "name", "search_products",
                "description", "Tìm sản phẩm thật trong catalog ShopTech theo từ khoá, danh mục, thương hiệu, khoảng giá.",
                "parameters", Map.of("type", "object", "properties", props)));
    }
}
