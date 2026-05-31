package com.taskmanagement.controller;

import com.taskmanagement.config.AuthService;
import com.taskmanagement.config.LoginRateLimiter;
import com.taskmanagement.config.SecurityUtils;
import com.taskmanagement.dto.request.LoginRequest;
import com.taskmanagement.dto.request.RegisterRequest;
import com.taskmanagement.dto.response.LoginResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "Login, registration and token refresh")
public class AuthController {

    private final AuthService authService;
    private final LoginRateLimiter rateLimiter;

    @Operation(summary = "Authenticate and receive a JWT token")
    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request, HttpServletRequest http) {
        String clientKey = clientIp(http);
        if (!rateLimiter.tryAcquire(clientKey)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("status", 429, "error", "Too Many Requests",
                            "message", "Too many login attempts. Please try again in a minute."));
        }

        Optional<LoginResponse> response = authService.authenticate(request);
        if (response.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("status", 401, "error", "Unauthorized",
                            "message", "Invalid username or password, or account is inactive"));
        }
        return ResponseEntity.ok(response.get());
    }

    @Operation(summary = "Register a new account (created as MEMBER)")
    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        try {
            LoginResponse response = authService.register(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("status", 409, "error", "Conflict", "message", ex.getMessage()));
        }
    }

    @Operation(summary = "Refresh the JWT token for the current user")
    @PostMapping("/refresh")
    public ResponseEntity<?> refresh() {
        return SecurityUtils.currentUserId()
                .flatMap(authService::refresh)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("status", 401, "error", "Unauthorized",
                                "message", "Cannot refresh token")));
    }

    @Operation(summary = "Logout (stateless: client discards the token)")
    @PostMapping("/logout")
    public ResponseEntity<?> logout() {
        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }

    private String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
