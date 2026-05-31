import type { IUser, ITask, ITaskAssignment, IComment, INotification, IAttachment } from "../utils/interfaces";


// Tên tệp: mockData.ts

// --- Mock Users ---
export const MOCK_USERS: IUser[] = [
    {
        user_id: 1,
        username: 'admin_a',
        email: 'admin.a@example.com',
        full_name: 'Nguyễn Văn A',
        role: 'ADMIN',
        created_at: '2025-10-01T10:00:00Z',
        is_active: true,
    },
    {
        user_id: 2,
        username: 'employee_b',
        email: 'employee.b@example.com',
        full_name: 'Trần Thị B',
        role: 'MEMBER',
        created_at: '2025-10-01T10:05:00Z',
        is_active: true,
    },
    {
        user_id: 3,
        username: 'employee_c',
        email: 'employee.c@example.com',
        full_name: 'Lê Văn C',
        role: 'MEMBER',
        created_at: '2025-10-02T11:00:00Z',
        is_active: true,
    },
    {
        user_id: 4,
        username: 'admin_d',
        email: 'admin.d@example.com',
        full_name: 'Phạm Thị D',
        role: 'ADMIN',
        created_at: '2025-10-03T09:30:00Z',
        is_active: true,
    },
];

// --- Mock Tasks ---
export const MOCK_TASKS: ITask[] = [
    {
        task_id: 1,
        title: 'Phân tích yêu cầu hệ thống',
        description: 'Thu thập và phân tích chi tiết yêu cầu người dùng cho dự án mới.',
        start_date: '2025-11-10',
        due_date: '2025-11-15',
        completed_date: '2025-11-15T14:30:00Z',
        status: 'completed',
        priority: 'high',
        category: 'Phân tích',
        created_at: '2025-11-09T08:00:00Z',
        updated_at: '2025-11-15T14:30:00Z',
        is_trashed: false,
    },
    {
        task_id: 2,
        title: 'Thiết kế cơ sở dữ liệu',
        description: 'Xây dựng mô hình ERD và tạo script database.',
        start_date: '2025-11-16',
        due_date: '2025-11-20',
        completed_date: null,
        status: 'in progress',
        priority: 'urgent',
        category: 'Thiết kế',
        created_at: '2025-11-15T16:00:00Z',
        updated_at: '2025-11-17T09:00:00Z',
        is_trashed: false,
    },
    {
        task_id: 3,
        title: 'Phát triển module đăng nhập',
        description: 'Xây dựng giao diện và logic xử lý đăng nhập/đăng ký.',
        start_date: '2025-11-21',
        due_date: '2025-11-25',
        completed_date: null,
        status: 'pending',
        priority: 'high',
        category: 'Lập trình',
        created_at: '2025-11-20T10:00:00Z',
        updated_at: '2025-11-20T10:00:00Z',
        is_trashed: false,
    },
    {
        task_id: 4,
        title: 'Test tính năng thanh toán',
        description: 'Kiểm thử các tính năng thanh toán và xử lý giao dịch.',
        start_date: '2025-10-15',
        due_date: '2025-10-20',
        completed_date: null,
        status: 'completed',
        priority: 'medium',
        category: 'Testing',
        created_at: '2025-10-14T08:00:00Z',
        updated_at: '2025-11-01T10:00:00Z',
        is_trashed: true,
    },
    {
        task_id: 5,
        title: 'Cập nhật tài liệu API',
        description: 'Cập nhật và bổ sung tài liệu API cho các endpoint mới.',
        start_date: '2025-10-10',
        due_date: '2025-10-15',
        completed_date: null,
        status: 'completed',
        priority: 'low',
        category: 'Documentation',
        created_at: '2025-10-09T09:00:00Z',
        updated_at: '2025-10-25T14:30:00Z',
        is_trashed: true,
    },
];

// --- Mock Attachments ---
export const MOCK_ATTACHMENTS: IAttachment[] = [
    {
        attachment_id: 1,
        task_id: 1,
        file_name: 'requirements_document.pdf',
        file_type: 'application/pdf',
        file_size: 245760, // 240 KB
        file_url: '/attachments/requirements_document.pdf',
        uploaded_by: 1,
        uploaded_at: '2025-11-10T09:15:00Z',
    },
    {
        attachment_id: 2,
        task_id: 2,
        file_name: 'database_design.png',
        file_type: 'image/png',
        file_size: 512000, // 500 KB
        file_url: '/attachments/database_design.png',
        uploaded_by: 2,
        uploaded_at: '2025-11-17T10:30:00Z',
    },
    {
        attachment_id: 3,
        task_id: 2,
        file_name: 'erd_diagram.pdf',
        file_type: 'application/pdf',
        file_size: 1024000, // 1 MB
        file_url: '/attachments/erd_diagram.pdf',
        uploaded_by: 3,
        uploaded_at: '2025-11-18T14:20:00Z',
    },
    {
        attachment_id: 4,
        task_id: 3,
        file_name: 'login_flowchart.jpg',
        file_type: 'image/jpeg',
        file_size: 307200, // 300 KB
        file_url: '/attachments/login_flowchart.jpg',
        uploaded_by: 2,
        uploaded_at: '2025-11-21T11:00:00Z',
    },
];

// --- Mock Task Assignments ---
export const MOCK_ASSIGNMENTS: ITaskAssignment[] = [
    { assignment_id: 1, user_id: 1, task_id: 1, assigned_date: '2025-11-09T08:00:00Z' },
    { assignment_id: 2, user_id: 2, task_id: 2, assigned_date: '2025-11-16T09:00:00Z' },
    { assignment_id: 3, user_id: 3, task_id: 2, assigned_date: '2025-11-16T09:05:00Z' },
    { assignment_id: 4, user_id: 2, task_id: 3, assigned_date: '2025-11-20T10:30:00Z' },
    { assignment_id: 5, user_id: 1, task_id: 4, assigned_date: '2025-10-14T08:00:00Z' },
    { assignment_id: 6, user_id: 3, task_id: 5, assigned_date: '2025-10-09T09:00:00Z' },
];

// --- Mock Comments ---
export const MOCK_COMMENTS: IComment[] = [
    { comment_id: 1, user_id: 1, task_id: 1, parent_comment_id: null, text: 'Yêu cầu đã được xác nhận, bắt đầu thực hiện.', created_at: '2025-11-10T09:00:00Z', category: 'Started' },
    { comment_id: 2, user_id: 2, task_id: 2, parent_comment_id: null, text: 'Cần thêm thông tin về các trường bảo mật.', created_at: '2025-11-17T08:30:00Z', category: 'Commented' },
    { comment_id: 3, user_id: 1, task_id: 2, parent_comment_id: null, text: 'Đã gửi tài liệu bảo mật qua email.', created_at: '2025-11-17T09:00:00Z', category: 'Commented' },
    { comment_id: 4, user_id: 3, task_id: 2, parent_comment_id: null, text: 'Hoàn thành mô hình ERD, đang chuyển sang script.', created_at: '2025-11-18T14:00:00Z', category: 'In Progress' },
    // Reply cho comment_id 3
    { comment_id: 5, user_id: 2, task_id: 2, parent_comment_id: 3, text: 'Cảm ơn, tôi đã nhận được tài liệu.', created_at: '2025-11-17T09:15:00Z', category: 'Commented' },
];

// --- Mock Notifications ---
export const MOCK_NOTIFICATIONS: INotification[] = [
    {
        notification_id: 1,
        user_id: 2,
        task_id: 2,
        message: 'Bạn đã được giao nhiệm vụ "Thiết kế cơ sở dữ liệu".',
        type: 'assignment',
        created_at: '2025-11-16T09:00:00Z',
        sent_at: '2025-11-16T09:00:00Z',
        is_read: false,
    },
    {
        notification_id: 2,
        user_id: 2,
        task_id: 2,
        message: 'Trưởng nhóm đã bình luận về nhiệm vụ "Thiết kế cơ sở dữ liệu".',
        type: 'comment',
        created_at: '2025-11-17T09:00:00Z',
        sent_at: '2025-11-17T09:00:00Z',
        is_read: false,
    },
    {
        notification_id: 3,
        user_id: 2,
        task_id: 3,
        message: 'Nhiệm vụ "Phát triển module đăng nhập" sắp đến hạn.',
        type: 'reminder',
        created_at: '2025-11-23T08:00:00Z',
        sent_at: '2025-11-23T08:00:00Z',
        is_read: true,
    },
];