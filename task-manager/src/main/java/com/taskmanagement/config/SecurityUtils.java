package com.taskmanagement.config;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;

/** Convenience accessors for the currently authenticated {@link AuthUser}. */
public final class SecurityUtils {

    private SecurityUtils() {
    }

    public static Optional<AuthUser> currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof AuthUser authUser) {
            return Optional.of(authUser);
        }
        return Optional.empty();
    }

    public static Optional<Integer> currentUserId() {
        return currentUser().map(AuthUser::userId);
    }

    public static boolean isAdmin() {
        return currentUser().map(u -> "ADMIN".equals(u.role())).orElse(false);
    }
}
