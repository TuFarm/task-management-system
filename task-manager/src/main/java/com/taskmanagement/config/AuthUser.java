package com.taskmanagement.config;

/**
 * Lightweight authenticated principal carried in the SecurityContext.
 * Populated from JWT claims by {@link JwtAuthenticationFilter}.
 */
public record AuthUser(Integer userId, String username, String role) {
}
