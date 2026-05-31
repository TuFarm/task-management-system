package com.taskmanagement.config;

import com.taskmanagement.dto.request.LoginRequest;
import com.taskmanagement.dto.request.RegisterRequest;
import com.taskmanagement.dto.response.LoginResponse;
import com.taskmanagement.dto.response.UserDTO;
import com.taskmanagement.entity.User;
import com.taskmanagement.repository.UserRepo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private static final String[] DEFAULT_COLORS = {
            "#5B8DEF", "#5ECFB1", "#F5A864", "#F56565", "#9F7AEA", "#48BB78"
    };

    private final UserRepo userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public Optional<LoginResponse> authenticate(LoginRequest request) {
        Optional<User> userOpt = userRepository.findByUsername(request.getUsername());

        if (userOpt.isEmpty()) {
            log.warn("Login failed: unknown username '{}'", request.getUsername());
            return Optional.empty();
        }

        User user = userOpt.get();

        if (user.getStatus() != User.UserStatus.ACTIVE) {
            log.warn("Login failed: inactive account '{}'", request.getUsername());
            return Optional.empty();
        }

        if (request.getPassword() == null
                || !passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            log.warn("Login failed: bad password for '{}'", request.getUsername());
            return Optional.empty();
        }

        log.info("Login success: '{}' (role={})", user.getUsername(), user.getRole());
        return Optional.of(buildResponse(user));
    }

    @Transactional
    public LoginResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new IllegalArgumentException("Username already exists");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email already exists");
        }

        User user = new User();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setFullName(request.getFullName());
        user.setRole(User.UserRole.MEMBER); // new registrations are always MEMBER
        user.setStatus(User.UserStatus.ACTIVE);
        user.setAvatarColor(DEFAULT_COLORS[(int) (Math.random() * DEFAULT_COLORS.length)]);

        User saved = userRepository.save(user);
        log.info("New user registered: '{}'", saved.getUsername());
        return buildResponse(saved);
    }

    /** Re-issues a token for the already-authenticated user. */
    public Optional<LoginResponse> refresh(Integer userId) {
        return userRepository.findById(userId)
                .filter(u -> u.getStatus() == User.UserStatus.ACTIVE)
                .map(this::buildResponse);
    }

    private LoginResponse buildResponse(User user) {
        UserDTO userDTO = UserDTO.builder()
                .userId(user.getUserId())
                .username(user.getUsername())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .role(user.getRole().name())
                .status(user.getStatus().name())
                .avatarColor(user.getAvatarColor())
                .createdAt(user.getCreatedAt())
                .build();

        return LoginResponse.builder()
                .token(jwtUtil.generateToken(user))
                .tokenType("Bearer")
                .expiresIn(jwtUtil.getExpirationMs())
                .user(userDTO)
                .build();
    }
}
