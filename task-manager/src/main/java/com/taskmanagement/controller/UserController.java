package com.taskmanagement.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.*;

import com.taskmanagement.config.SecurityUtils;
import com.taskmanagement.dto.request.ChangePasswordRequest;
import com.taskmanagement.dto.request.CreateUserRequest;
import com.taskmanagement.dto.request.UpdateUserRequest;
import com.taskmanagement.dto.response.UserDTO;
import com.taskmanagement.service.UserService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@Tag(name = "Users", description = "User management, roles and password changes")
public class UserController {

    private final UserService userService;

    @Operation(summary = "List all users")
    @GetMapping
    public List<UserDTO> getAllUsers() {
        return userService.getAllUsers();
    }

    @Operation(summary = "Get a user by id")
    @GetMapping("/{id}")
    public ResponseEntity<UserDTO> getUserById(@PathVariable Integer id) {
        return userService.getUserById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @Operation(summary = "Create a user (ADMIN only)")
    @PostMapping
    public ResponseEntity<UserDTO> createUser(@Valid @RequestBody CreateUserRequest request) {
        return ResponseEntity.ok(userService.createUser(request));
    }

    @Operation(summary = "Update a user")
    @PutMapping("/{id}")
    public ResponseEntity<UserDTO> updateUser(@PathVariable Integer id,
                                              @RequestBody UpdateUserRequest request) {
        // Only ADMIN may change roles via the general update endpoint.
        if (request.getRole() != null && !SecurityUtils.isAdmin()) {
            throw new AccessDeniedException("Only an ADMIN can change roles");
        }
        return userService.updateUser(id, request)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @Operation(summary = "Change a user's role (ADMIN only)")
    @PutMapping("/{id}/role")
    public ResponseEntity<UserDTO> changeRole(@PathVariable Integer id,
                                              @RequestBody Map<String, String> body) {
        String role = body.get("role");
        return userService.changeRole(id, role)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @Operation(summary = "Change a user's password (self or ADMIN)")
    @PutMapping("/{id}/password")
    public ResponseEntity<?> changePassword(@PathVariable Integer id,
                                            @Valid @RequestBody ChangePasswordRequest request) {
        Integer currentUserId = SecurityUtils.currentUserId().orElse(null);
        if (!id.equals(currentUserId) && !SecurityUtils.isAdmin()) {
            throw new AccessDeniedException("You can only change your own password");
        }
        userService.changePassword(id, request);
        return ResponseEntity.ok(Map.of("message", "Password changed successfully"));
    }

    @Operation(summary = "Deactivate (soft-delete) a user (ADMIN only)")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Integer id) {
        boolean updated = userService.deactivateUser(id);
        return updated ? ResponseEntity.ok().build() : ResponseEntity.notFound().build();
    }

    @Operation(summary = "Activate a user (ADMIN only)")
    @PutMapping("/{id}/activate")
    public ResponseEntity<UserDTO> activateUser(@PathVariable Integer id) {
        return userService.activateUser(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
