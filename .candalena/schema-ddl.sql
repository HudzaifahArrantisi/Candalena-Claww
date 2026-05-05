-- Database Schema Dump (MYSQL)
-- Generated: 2026-05-05T21:23:52.083Z
-- Total tables/collections: 34

-- ═══════════════════════════════════════
-- Table: admin
-- Columns: 13
-- ═══════════════════════════════════════
CREATE TABLE admin (
    id int PRIMARY KEY auto_increment,
    user_id int NOT NULL,
    name varchar(255) NOT NULL,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP DEFAULT_GENERATED,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP DEFAULT_GENERATED on update CURRENT_TIMESTAMP,
    deleted_at timestamp,
    username varchar(100),
    bio text,
    website varchar(255),
    phone varchar(20),
    profile_picture varchar(255),
    followers_count int DEFAULT 0,
    following_count int DEFAULT 0
);

-- ═══════════════════════════════════════
-- Table: attendance
-- Columns: 10
-- ═══════════════════════════════════════
CREATE TABLE attendance (
    id int PRIMARY KEY auto_increment,
    student_id int NOT NULL,
    session_id varchar(255) NOT NULL,
    student_code varchar(255) NOT NULL,
    status enum('hadir','izin','sakit','alpa') DEFAULT hadir,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP DEFAULT_GENERATED,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP DEFAULT_GENERATED on update CURRENT_TIMESTAMP,
    deleted_at timestamp,
    created_date date STORED GENERATED,
    pertemuan_ke int DEFAULT 1
);

-- ═══════════════════════════════════════
-- Table: attendance_sessions
-- Columns: 11
-- ═══════════════════════════════════════
CREATE TABLE attendance_sessions (
    id int PRIMARY KEY auto_increment,
    dosen_id int NOT NULL,
    course_id varchar(10) NOT NULL,
    session_token varchar(100),
    session_code varchar(50) NOT NULL,
    qr_token varchar(100),
    expires_at timestamp NOT NULL,
    status enum('active','closed') DEFAULT active,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP DEFAULT_GENERATED,
    pertemuan_ke int DEFAULT 1,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP DEFAULT_GENERATED on update CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════
-- Table: comments
-- Columns: 10
-- ═══════════════════════════════════════
CREATE TABLE comments (
    id int PRIMARY KEY auto_increment,
    post_id int NOT NULL,
    parent_id int,
    user_id int NOT NULL,
    user_role varchar(50) NOT NULL,
    author_name varchar(255) NOT NULL,
    content text NOT NULL,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP DEFAULT_GENERATED,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP DEFAULT_GENERATED on update CURRENT_TIMESTAMP,
    deleted_at timestamp
);

-- ═══════════════════════════════════════
-- Table: content_moderation
-- Columns: 7
-- ═══════════════════════════════════════
CREATE TABLE content_moderation (
    id int PRIMARY KEY auto_increment,
    content_type enum('post','comment') NOT NULL,
    content_id int NOT NULL,
    status enum('pending','approved','rejected') DEFAULT pending,
    moderated_by int,
    reason text,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP DEFAULT_GENERATED
);

-- ═══════════════════════════════════════
-- Table: conversation_participants
-- Columns: 6
-- ═══════════════════════════════════════
CREATE TABLE conversation_participants (
    id int PRIMARY KEY auto_increment,
    conversation_id int NOT NULL,
    user_id int NOT NULL,
    role enum('admin','member','owner') DEFAULT member,
    joined_at timestamp DEFAULT CURRENT_TIMESTAMP DEFAULT_GENERATED,
    last_read_at timestamp
);

-- ═══════════════════════════════════════
-- Table: conversations
-- Columns: 7
-- ═══════════════════════════════════════
CREATE TABLE conversations (
    id int PRIMARY KEY auto_increment,
    type enum('private','group') NOT NULL,
    name varchar(255),
    mata_kuliah_id int,
    created_by int NOT NULL,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP DEFAULT_GENERATED,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP DEFAULT_GENERATED on update CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════
-- Table: dosen
-- Columns: 7
-- ═══════════════════════════════════════
CREATE TABLE dosen (
    id int PRIMARY KEY auto_increment,
    user_id int NOT NULL,
    name varchar(255) NOT NULL,
    nip varchar(100),
    created_at timestamp DEFAULT CURRENT_TIMESTAMP DEFAULT_GENERATED,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP DEFAULT_GENERATED on update CURRENT_TIMESTAMP,
    deleted_at timestamp
);

-- ═══════════════════════════════════════
-- Table: likes
-- Columns: 6
-- ═══════════════════════════════════════
CREATE TABLE likes (
    id int PRIMARY KEY auto_increment,
    post_id int NOT NULL,
    user_id int NOT NULL,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP DEFAULT_GENERATED,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP DEFAULT_GENERATED on update CURRENT_TIMESTAMP,
    deleted_at timestamp
);

-- ═══════════════════════════════════════
-- Table: mahasiswa
-- Columns: 11
-- ═══════════════════════════════════════
CREATE TABLE mahasiswa (
    id int PRIMARY KEY auto_increment,
    user_id int NOT NULL,
    name varchar(255) NOT NULL,
    nim varchar(50) NOT NULL,
    alamat text,
    photo varchar(255),
    created_at timestamp DEFAULT CURRENT_TIMESTAMP DEFAULT_GENERATED,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP DEFAULT_GENERATED on update CURRENT_TIMESTAMP,
    deleted_at timestamp,
    sisa_ukt decimal(15,2) DEFAULT 7000000.00,
    total_ukt_dibayar decimal(15,2) DEFAULT 0.00
);

-- ═══════════════════════════════════════
-- Table: mahasiswa_mata_kuliah
-- Columns: 4
-- ═══════════════════════════════════════
CREATE TABLE mahasiswa_mata_kuliah (
    id int PRIMARY KEY auto_increment,
    mahasiswa_id int NOT NULL,
    mata_kuliah_kode varchar(100) NOT NULL,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP DEFAULT_GENERATED
);

-- ═══════════════════════════════════════
-- Table: mata_kuliah
-- Columns: 12
-- ═══════════════════════════════════════
CREATE TABLE mata_kuliah (
    id int PRIMARY KEY auto_increment,
    kode varchar(100) NOT NULL,
    nama varchar(255) NOT NULL,
    sks int NOT NULL,
    dosen_id int NOT NULL,
    semester int NOT NULL,
    hari varchar(10),
    jam_mulai time,
    jam_selesai time,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP DEFAULT_GENERATED,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP DEFAULT_GENERATED on update CURRENT_TIMESTAMP,
    deleted_at timestamp
);

-- ═══════════════════════════════════════
-- Table: mata_kuliah_chat_groups
-- Columns: 5
-- ═══════════════════════════════════════
CREATE TABLE mata_kuliah_chat_groups (
    id int PRIMARY KEY auto_increment,
    mata_kuliah_id int NOT NULL,
    conversation_id int NOT NULL,
    created_by int NOT NULL,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP DEFAULT_GENERATED
);

-- ═══════════════════════════════════════
-- Table: messages
-- Columns: 13
-- ═══════════════════════════════════════
CREATE TABLE messages (
    id int PRIMARY KEY auto_increment,
    conversation_id int NOT NULL,
    sender_id int NOT NULL,
    message_type enum('text','image','file','system') DEFAULT text,
    content text NOT NULL,
    file_url varchar(500),
    file_name varchar(255),
    file_size int,
    is_read tinyint(1) DEFAULT 0,
    read_at timestamp,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP DEFAULT_GENERATED,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP DEFAULT_GENERATED on update CURRENT_TIMESTAMP,
    deleted_at timestamp
);

-- ═══════════════════════════════════════
-- Table: notifications
-- Columns: 9
-- ═══════════════════════════════════════
CREATE TABLE notifications (
    id int PRIMARY KEY auto_increment,
    user_id int NOT NULL,
    type enum('like','comment','system','follow') NOT NULL,
    source_id int,
    message text NOT NULL,
    is_read tinyint(1) DEFAULT 0,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP DEFAULT_GENERATED,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP DEFAULT_GENERATED on update CURRENT_TIMESTAMP,
    deleted_at timestamp
);

-- ═══════════════════════════════════════
-- Table: openclaw_event_outbox
-- Columns: 11
-- ═══════════════════════════════════════
CREATE TABLE openclaw_event_outbox (
    id bigint PRIMARY KEY auto_increment,
    event_id varchar(36) NOT NULL,
    event_type varchar(50) NOT NULL DEFAULT tugas_created,
    payload json NOT NULL,
    status enum('pending','processing','success','failed') NOT NULL DEFAULT pending,
    attempts int NOT NULL DEFAULT 0,
    max_attempts int NOT NULL DEFAULT 3,
    next_retry_at datetime,
    last_error text,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP DEFAULT_GENERATED,
    updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP DEFAULT_GENERATED on update CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════
-- Table: openclaw_notification_log
-- Columns: 12
-- ═══════════════════════════════════════
CREATE TABLE openclaw_notification_log (
    id bigint PRIMARY KEY auto_increment,
    tugas_id int NOT NULL,
    reminder_type enum('instant','h3','h2','h1','h0') NOT NULL,
    recipient_type enum('channel','user') NOT NULL DEFAULT channel,
    recipient_id varchar(100) NOT NULL,
    status enum('pending','success','failed') NOT NULL DEFAULT pending,
    sent_on date NOT NULL,
    message_text text,
    error_message text,
    attempts int NOT NULL DEFAULT 0,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP DEFAULT_GENERATED,
    updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP DEFAULT_GENERATED on update CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════
-- Table: ormawa
-- Columns: 13
-- ═══════════════════════════════════════
CREATE TABLE ormawa (
    id int PRIMARY KEY auto_increment,
    user_id int NOT NULL,
    name varchar(255) NOT NULL,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP DEFAULT_GENERATED,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP DEFAULT_GENERATED on update CURRENT_TIMESTAMP,
    deleted_at timestamp,
    username varchar(100),
    bio text,
    website varchar(255),
    phone varchar(20),
    profile_picture varchar(255),
    followers_count int DEFAULT 0,
    following_count int DEFAULT 0
);

-- ═══════════════════════════════════════
-- Table: ortu
-- Columns: 8
-- ═══════════════════════════════════════
CREATE TABLE ortu (
    id int PRIMARY KEY auto_increment,
    user_id int NOT NULL,
    name varchar(255) NOT NULL,
    alamat text,
    child_id int NOT NULL,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP DEFAULT_GENERATED,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP DEFAULT_GENERATED on update CURRENT_TIMESTAMP,
    deleted_at timestamp
);

-- ═══════════════════════════════════════
-- Table: payment_logs
-- Columns: 5
-- ═══════════════════════════════════════
CREATE TABLE payment_logs (
    id int PRIMARY KEY auto_increment,
    invoice_uuid varchar(255),
    action varchar(50),
    details text,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP DEFAULT_GENERATED
);

-- ═══════════════════════════════════════
-- Table: pertemuan_mata_kuliah
-- Columns: 7
-- ═══════════════════════════════════════
CREATE TABLE pertemuan_mata_kuliah (
    id int PRIMARY KEY auto_increment,
    course_id varchar(10) NOT NULL,
    pertemuan_ke int NOT NULL,
    tanggal date NOT NULL,
    topik varchar(255),
    deskripsi text,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP DEFAULT_GENERATED
);

-- ═══════════════════════════════════════
-- Table: pinned_conversations
-- Columns: 4
-- ═══════════════════════════════════════
CREATE TABLE pinned_conversations (
    id int PRIMARY KEY auto_increment,
    user_id int NOT NULL,
    conversation_id int NOT NULL,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP DEFAULT_GENERATED
);

-- ═══════════════════════════════════════
-- Table: post_engagements
-- Columns: 7
-- ═══════════════════════════════════════
CREATE TABLE post_engagements (
    id int PRIMARY KEY auto_increment,
    post_id int NOT NULL,
    impressions int DEFAULT 0,
    clicks int DEFAULT 0,
    engagement_rate float DEFAULT 0,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP DEFAULT_GENERATED,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP DEFAULT_GENERATED on update CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════
-- Table: posts
-- Columns: 13
-- ═══════════════════════════════════════
CREATE TABLE posts (
    id int PRIMARY KEY auto_increment,
    user_id int NOT NULL,
    role enum('admin','dosen','mahasiswa','ormawa','ukm','orangtua') NOT NULL,
    title varchar(255) NOT NULL,
    content text NOT NULL,
    media_url varchar(255),
    created_at timestamp DEFAULT CURRENT_TIMESTAMP DEFAULT_GENERATED,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP DEFAULT_GENERATED on update CURRENT_TIMESTAMP,
    deleted_at timestamp,
    author_name varchar(255) NOT NULL DEFAULT Unknown,
    likes_count int DEFAULT 0,
    comments_count int DEFAULT 0,
    author_username varchar(100)
);

-- ═══════════════════════════════════════
-- Table: riwayat_pembayaran
-- Columns: 16
-- ═══════════════════════════════════════
CREATE TABLE riwayat_pembayaran (
    id int PRIMARY KEY auto_increment,
    mahasiswa_id int NOT NULL,
    invoice_uuid varchar(255) NOT NULL,
    metode enum('qris','transfer') NOT NULL,
    payment_method varchar(50),
    nominal decimal(15,2) NOT NULL,
    biaya_admin decimal(15,2) NOT NULL DEFAULT 0.00,
    total_dibayar decimal(15,2) NOT NULL,
    payment_number text,
    pakasir_order_id varchar(255),
    status enum('pending','success','failed') DEFAULT pending,
    tanggal timestamp DEFAULT CURRENT_TIMESTAMP DEFAULT_GENERATED,
    expired_at datetime,
    invoice_url text,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP DEFAULT_GENERATED,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP DEFAULT_GENERATED on update CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════
-- Table: saved_posts
-- Columns: 7
-- ═══════════════════════════════════════
CREATE TABLE saved_posts (
    id int PRIMARY KEY auto_increment,
    post_id int NOT NULL,
    user_id int NOT NULL,
    user_role varchar(50) NOT NULL,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP DEFAULT_GENERATED,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP DEFAULT_GENERATED on update CURRENT_TIMESTAMP,
    deleted_at timestamp
);

-- ═══════════════════════════════════════
-- Table: schedule
-- Columns: 6
-- ═══════════════════════════════════════
CREATE TABLE schedule (
    id int PRIMARY KEY auto_increment,
    mata_kuliah_kode varchar(10) NOT NULL,
    hari enum('senin','selasa','rabu','kamis','jumat','sabtu','minggu'),
    jam_mulai time NOT NULL,
    jam_selesai time NOT NULL,
    ruangan varchar(50)
);

-- ═══════════════════════════════════════
-- Table: submissions
-- Columns: 9
-- ═══════════════════════════════════════
CREATE TABLE submissions (
    id int PRIMARY KEY auto_increment,
    task_id int NOT NULL,
    student_id int NOT NULL,
    file_url varchar(255),
    answer_text text,
    grade decimal(5,2),
    created_at timestamp DEFAULT CURRENT_TIMESTAMP DEFAULT_GENERATED,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP DEFAULT_GENERATED on update CURRENT_TIMESTAMP,
    deleted_at timestamp
);

-- ═══════════════════════════════════════
-- Table: tugas
-- Columns: 11
-- ═══════════════════════════════════════
CREATE TABLE tugas (
    id int PRIMARY KEY auto_increment,
    course_id varchar(100) NOT NULL,
    pertemuan int NOT NULL DEFAULT 1,
    title varchar(255) NOT NULL,
    description text,
    file_tugas varchar(255),
    due_date datetime,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP DEFAULT_GENERATED,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP DEFAULT_GENERATED on update CURRENT_TIMESTAMP,
    deleted_at timestamp,
    type enum('materi','tugas') DEFAULT tugas
);

-- ═══════════════════════════════════════
-- Table: ukm
-- Columns: 13
-- ═══════════════════════════════════════
CREATE TABLE ukm (
    id int PRIMARY KEY auto_increment,
    user_id int NOT NULL,
    name varchar(255) NOT NULL,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP DEFAULT_GENERATED,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP DEFAULT_GENERATED on update CURRENT_TIMESTAMP,
    deleted_at timestamp,
    username varchar(100),
    bio text,
    website varchar(255),
    phone varchar(20),
    profile_picture varchar(255),
    followers_count int DEFAULT 0,
    following_count int DEFAULT 0
);

-- ═══════════════════════════════════════
-- Table: ukt_invoices
-- Columns: 11
-- ═══════════════════════════════════════
CREATE TABLE ukt_invoices (
    id int PRIMARY KEY auto_increment,
    student_id int NOT NULL,
    amount decimal(10,2) NOT NULL,
    uuid varchar(255) NOT NULL,
    status enum('pending','paid','cancelled') DEFAULT pending,
    payment_method varchar(50),
    completed_at timestamp,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP DEFAULT_GENERATED,
    expired_at datetime,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP DEFAULT_GENERATED on update CURRENT_TIMESTAMP,
    deleted_at timestamp
);

-- ═══════════════════════════════════════
-- Table: users
-- Columns: 7
-- ═══════════════════════════════════════
CREATE TABLE users (
    id int PRIMARY KEY auto_increment,
    email varchar(255) NOT NULL,
    password varchar(255) NOT NULL,
    role enum('admin','dosen','mahasiswa','orangtua','ukm','ormawa') NOT NULL,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP DEFAULT_GENERATED,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP DEFAULT_GENERATED on update CURRENT_TIMESTAMP,
    deleted_at timestamp
);

-- ═══════════════════════════════════════
-- Table: webhook_logs
-- Columns: 6
-- ═══════════════════════════════════════
CREATE TABLE webhook_logs (
    id int PRIMARY KEY auto_increment,
    order_id varchar(255) NOT NULL,
    status varchar(50) NOT NULL,
    amount bigint NOT NULL,
    payload text,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP DEFAULT_GENERATED
);

-- ═══════════════════════════════════════
-- Table: webhook_test
-- Columns: 5
-- ═══════════════════════════════════════
CREATE TABLE webhook_test (
    id int PRIMARY KEY auto_increment,
    order_id varchar(255) NOT NULL,
    status varchar(50) NOT NULL,
    amount bigint NOT NULL,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP DEFAULT_GENERATED
);

-- ═══════════════════════════════════════
-- Foreign Key Relationships
-- ═══════════════════════════════════════
-- admin.user_id → users.id (admin_ibfk_1)
ALTER TABLE admin ADD CONSTRAINT admin_ibfk_1
  FOREIGN KEY (user_id) REFERENCES users(id);

-- attendance_sessions.course_id → mata_kuliah.kode (attendance_sessions_ibfk_2)
ALTER TABLE attendance_sessions ADD CONSTRAINT attendance_sessions_ibfk_2
  FOREIGN KEY (course_id) REFERENCES mata_kuliah(kode);

-- attendance_sessions.dosen_id → dosen.id (attendance_sessions_ibfk_1)
ALTER TABLE attendance_sessions ADD CONSTRAINT attendance_sessions_ibfk_1
  FOREIGN KEY (dosen_id) REFERENCES dosen(id);

-- comments.parent_id → comments.id (comments_ibfk_3)
ALTER TABLE comments ADD CONSTRAINT comments_ibfk_3
  FOREIGN KEY (parent_id) REFERENCES comments(id);

-- comments.post_id → posts.id (comments_ibfk_1)
ALTER TABLE comments ADD CONSTRAINT comments_ibfk_1
  FOREIGN KEY (post_id) REFERENCES posts(id);

-- comments.user_id → users.id (comments_ibfk_2)
ALTER TABLE comments ADD CONSTRAINT comments_ibfk_2
  FOREIGN KEY (user_id) REFERENCES users(id);

-- content_moderation.moderated_by → users.id (content_moderation_ibfk_1)
ALTER TABLE content_moderation ADD CONSTRAINT content_moderation_ibfk_1
  FOREIGN KEY (moderated_by) REFERENCES users(id);

-- conversation_participants.conversation_id → conversations.id (conversation_participants_ibfk_1)
ALTER TABLE conversation_participants ADD CONSTRAINT conversation_participants_ibfk_1
  FOREIGN KEY (conversation_id) REFERENCES conversations(id);

-- conversation_participants.user_id → users.id (conversation_participants_ibfk_2)
ALTER TABLE conversation_participants ADD CONSTRAINT conversation_participants_ibfk_2
  FOREIGN KEY (user_id) REFERENCES users(id);

-- conversations.created_by → users.id (conversations_ibfk_2)
ALTER TABLE conversations ADD CONSTRAINT conversations_ibfk_2
  FOREIGN KEY (created_by) REFERENCES users(id);

-- conversations.mata_kuliah_id → mata_kuliah.id (conversations_ibfk_1)
ALTER TABLE conversations ADD CONSTRAINT conversations_ibfk_1
  FOREIGN KEY (mata_kuliah_id) REFERENCES mata_kuliah(id);

-- dosen.user_id → users.id (dosen_ibfk_1)
ALTER TABLE dosen ADD CONSTRAINT dosen_ibfk_1
  FOREIGN KEY (user_id) REFERENCES users(id);

-- likes.post_id → posts.id (likes_ibfk_1)
ALTER TABLE likes ADD CONSTRAINT likes_ibfk_1
  FOREIGN KEY (post_id) REFERENCES posts(id);

-- likes.user_id → users.id (likes_ibfk_2)
ALTER TABLE likes ADD CONSTRAINT likes_ibfk_2
  FOREIGN KEY (user_id) REFERENCES users(id);

-- mahasiswa.user_id → users.id (mahasiswa_ibfk_1)
ALTER TABLE mahasiswa ADD CONSTRAINT mahasiswa_ibfk_1
  FOREIGN KEY (user_id) REFERENCES users(id);

-- mahasiswa_mata_kuliah.mahasiswa_id → mahasiswa.id (mahasiswa_mata_kuliah_ibfk_1)
ALTER TABLE mahasiswa_mata_kuliah ADD CONSTRAINT mahasiswa_mata_kuliah_ibfk_1
  FOREIGN KEY (mahasiswa_id) REFERENCES mahasiswa(id);

-- mahasiswa_mata_kuliah.mata_kuliah_kode → mata_kuliah.kode (mahasiswa_mata_kuliah_ibfk_2)
ALTER TABLE mahasiswa_mata_kuliah ADD CONSTRAINT mahasiswa_mata_kuliah_ibfk_2
  FOREIGN KEY (mata_kuliah_kode) REFERENCES mata_kuliah(kode);

-- mata_kuliah.dosen_id → dosen.id (mata_kuliah_ibfk_1)
ALTER TABLE mata_kuliah ADD CONSTRAINT mata_kuliah_ibfk_1
  FOREIGN KEY (dosen_id) REFERENCES dosen(id);

-- mata_kuliah_chat_groups.conversation_id → conversations.id (mata_kuliah_chat_groups_ibfk_2)
ALTER TABLE mata_kuliah_chat_groups ADD CONSTRAINT mata_kuliah_chat_groups_ibfk_2
  FOREIGN KEY (conversation_id) REFERENCES conversations(id);

-- mata_kuliah_chat_groups.created_by → users.id (mata_kuliah_chat_groups_ibfk_3)
ALTER TABLE mata_kuliah_chat_groups ADD CONSTRAINT mata_kuliah_chat_groups_ibfk_3
  FOREIGN KEY (created_by) REFERENCES users(id);

-- mata_kuliah_chat_groups.mata_kuliah_id → mata_kuliah.id (mata_kuliah_chat_groups_ibfk_1)
ALTER TABLE mata_kuliah_chat_groups ADD CONSTRAINT mata_kuliah_chat_groups_ibfk_1
  FOREIGN KEY (mata_kuliah_id) REFERENCES mata_kuliah(id);

-- messages.conversation_id → conversations.id (messages_ibfk_1)
ALTER TABLE messages ADD CONSTRAINT messages_ibfk_1
  FOREIGN KEY (conversation_id) REFERENCES conversations(id);

-- messages.sender_id → users.id (messages_ibfk_2)
ALTER TABLE messages ADD CONSTRAINT messages_ibfk_2
  FOREIGN KEY (sender_id) REFERENCES users(id);

-- notifications.user_id → users.id (notifications_ibfk_1)
ALTER TABLE notifications ADD CONSTRAINT notifications_ibfk_1
  FOREIGN KEY (user_id) REFERENCES users(id);

-- ormawa.user_id → users.id (ormawa_ibfk_1)
ALTER TABLE ormawa ADD CONSTRAINT ormawa_ibfk_1
  FOREIGN KEY (user_id) REFERENCES users(id);

-- ortu.child_id → mahasiswa.id (ortu_ibfk_2)
ALTER TABLE ortu ADD CONSTRAINT ortu_ibfk_2
  FOREIGN KEY (child_id) REFERENCES mahasiswa(id);

-- ortu.user_id → users.id (ortu_ibfk_1)
ALTER TABLE ortu ADD CONSTRAINT ortu_ibfk_1
  FOREIGN KEY (user_id) REFERENCES users(id);

-- pertemuan_mata_kuliah.course_id → mata_kuliah.kode (pertemuan_mata_kuliah_ibfk_1)
ALTER TABLE pertemuan_mata_kuliah ADD CONSTRAINT pertemuan_mata_kuliah_ibfk_1
  FOREIGN KEY (course_id) REFERENCES mata_kuliah(kode);

-- pinned_conversations.conversation_id → conversations.id (pinned_conversations_ibfk_2)
ALTER TABLE pinned_conversations ADD CONSTRAINT pinned_conversations_ibfk_2
  FOREIGN KEY (conversation_id) REFERENCES conversations(id);

-- pinned_conversations.user_id → users.id (pinned_conversations_ibfk_1)
ALTER TABLE pinned_conversations ADD CONSTRAINT pinned_conversations_ibfk_1
  FOREIGN KEY (user_id) REFERENCES users(id);

-- post_engagements.post_id → posts.id (post_engagements_ibfk_1)
ALTER TABLE post_engagements ADD CONSTRAINT post_engagements_ibfk_1
  FOREIGN KEY (post_id) REFERENCES posts(id);

-- posts.user_id → users.id (posts_ibfk_1)
ALTER TABLE posts ADD CONSTRAINT posts_ibfk_1
  FOREIGN KEY (user_id) REFERENCES users(id);

-- riwayat_pembayaran.mahasiswa_id → mahasiswa.id (riwayat_pembayaran_ibfk_1)
ALTER TABLE riwayat_pembayaran ADD CONSTRAINT riwayat_pembayaran_ibfk_1
  FOREIGN KEY (mahasiswa_id) REFERENCES mahasiswa(id);

-- riwayat_pembayaran.mahasiswa_id → mahasiswa.id (riwayat_pembayaran_ibfk_2)
ALTER TABLE riwayat_pembayaran ADD CONSTRAINT riwayat_pembayaran_ibfk_2
  FOREIGN KEY (mahasiswa_id) REFERENCES mahasiswa(id);

-- saved_posts.post_id → posts.id (saved_posts_ibfk_1)
ALTER TABLE saved_posts ADD CONSTRAINT saved_posts_ibfk_1
  FOREIGN KEY (post_id) REFERENCES posts(id);

-- schedule.mata_kuliah_kode → mata_kuliah.kode (schedule_ibfk_1)
ALTER TABLE schedule ADD CONSTRAINT schedule_ibfk_1
  FOREIGN KEY (mata_kuliah_kode) REFERENCES mata_kuliah(kode);

-- submissions.student_id → mahasiswa.id (submissions_ibfk_2)
ALTER TABLE submissions ADD CONSTRAINT submissions_ibfk_2
  FOREIGN KEY (student_id) REFERENCES mahasiswa(id);

-- submissions.task_id → tugas.id (submissions_ibfk_1)
ALTER TABLE submissions ADD CONSTRAINT submissions_ibfk_1
  FOREIGN KEY (task_id) REFERENCES tugas(id);

-- ukm.user_id → users.id (ukm_ibfk_1)
ALTER TABLE ukm ADD CONSTRAINT ukm_ibfk_1
  FOREIGN KEY (user_id) REFERENCES users(id);

-- ukt_invoices.student_id → mahasiswa.id (ukt_invoices_ibfk_1)
ALTER TABLE ukt_invoices ADD CONSTRAINT ukt_invoices_ibfk_1
  FOREIGN KEY (student_id) REFERENCES mahasiswa(id);

-- ═══════════════════════════════════════
-- Relationship Summary
-- ═══════════════════════════════════════
-- admin ──[user_id]──> users.id
-- attendance_sessions ──[course_id]──> mata_kuliah.kode
-- attendance_sessions ──[dosen_id]──> dosen.id
-- comments ──[parent_id]──> comments.id
-- comments ──[post_id]──> posts.id
-- comments ──[user_id]──> users.id
-- content_moderation ──[moderated_by]──> users.id
-- conversation_participants ──[conversation_id]──> conversations.id
-- conversation_participants ──[user_id]──> users.id
-- conversations ──[created_by]──> users.id
-- conversations ──[mata_kuliah_id]──> mata_kuliah.id
-- dosen ──[user_id]──> users.id
-- likes ──[post_id]──> posts.id
-- likes ──[user_id]──> users.id
-- mahasiswa ──[user_id]──> users.id
-- mahasiswa_mata_kuliah ──[mahasiswa_id]──> mahasiswa.id
-- mahasiswa_mata_kuliah ──[mata_kuliah_kode]──> mata_kuliah.kode
-- mata_kuliah ──[dosen_id]──> dosen.id
-- mata_kuliah_chat_groups ──[conversation_id]──> conversations.id
-- mata_kuliah_chat_groups ──[created_by]──> users.id
-- mata_kuliah_chat_groups ──[mata_kuliah_id]──> mata_kuliah.id
-- messages ──[conversation_id]──> conversations.id
-- messages ──[sender_id]──> users.id
-- notifications ──[user_id]──> users.id
-- ormawa ──[user_id]──> users.id
-- ortu ──[child_id]──> mahasiswa.id
-- ortu ──[user_id]──> users.id
-- pertemuan_mata_kuliah ──[course_id]──> mata_kuliah.kode
-- pinned_conversations ──[conversation_id]──> conversations.id
-- pinned_conversations ──[user_id]──> users.id
-- post_engagements ──[post_id]──> posts.id
-- posts ──[user_id]──> users.id
-- riwayat_pembayaran ──[mahasiswa_id]──> mahasiswa.id
-- riwayat_pembayaran ──[mahasiswa_id]──> mahasiswa.id
-- saved_posts ──[post_id]──> posts.id
-- schedule ──[mata_kuliah_kode]──> mata_kuliah.kode
-- submissions ──[student_id]──> mahasiswa.id
-- submissions ──[task_id]──> tugas.id
-- ukm ──[user_id]──> users.id
-- ukt_invoices ──[student_id]──> mahasiswa.id