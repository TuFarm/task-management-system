package com.taskmanagement.service;

import com.taskmanagement.dto.request.ChangePasswordRequest;
import com.taskmanagement.dto.request.CreateUserRequest;
import com.taskmanagement.dto.request.UpdateUserRequest;
import com.taskmanagement.dto.response.UserDTO;

import java.util.List;
import java.util.Optional;

public interface UserService {
    List<UserDTO> getAllUsers();
    Optional<UserDTO> getUserById(Integer id);
    UserDTO createUser(CreateUserRequest request);
    Optional<UserDTO> updateUser(Integer id, UpdateUserRequest request);
    boolean deactivateUser(Integer id);
    Optional<UserDTO> activateUser(Integer id);
    void changePassword(Integer id, ChangePasswordRequest request);
    Optional<UserDTO> changeRole(Integer id, String role);
}
