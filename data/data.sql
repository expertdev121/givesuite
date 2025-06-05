-- Sample Data SQL Dump for Donation/Payment Management System

-- Insert Categories (only three as requested)
INSERT INTO category (name, description, is_active) VALUES
('Donation', 'General charitable donations', true),
('Miscellaneous', 'Miscellaneous fees and charges', true),
('Tuition', 'Educational tuition fees', true);

-- Insert Contacts
INSERT INTO contact (first_name, last_name, email, phone, title, gender, address) VALUES
('David', 'Cohen', 'david.cohen@email.com', '+1-555-0101', 'mr', 'male', '123 Oak Street, Brooklyn, NY 11201'),
('Sarah', 'Goldberg', 'sarah.goldberg@email.com', '+1-555-0102', 'mrs', 'female', '456 Maple Ave, Lakewood, NJ 08701'),
('Michael', 'Rosenberg', 'michael.rosenberg@email.com', '+1-555-0103', 'dr', 'male', '789 Pine Road, Monsey, NY 10952'),
('Rachel', 'Stern', 'rachel.stern@email.com', '+1-555-0104', 'ms', 'female', '321 Cedar Lane, Baltimore, MD 21208'),
('Jonathan', 'Katz', 'jonathan.katz@email.com', '+1-555-0105', 'mr', 'male', '654 Birch Street, Chicago, IL 60645'),
('Miriam', 'Weiss', 'miriam.weiss@email.com', '+1-555-0106', 'mrs', 'female', '987 Elm Drive, Los Angeles, CA 90035'),
('Aaron', 'Friedman', 'aaron.friedman@email.com', '+1-555-0107', 'eng', 'male', '147 Spruce Court, Miami, FL 33154'),
('Esther', 'Klein', 'esther.klein@email.com', '+1-555-0108', 'prof', 'female', '258 Willow Way, Boston, MA 02134'),
('Benjamin', 'Roth', 'benjamin.roth@email.com', '+1-555-0109', 'mr', 'male', '369 Ash Avenue, Detroit, MI 48235'),
('Leah', 'Goldman', 'leah.goldman@email.com', '+1-555-0110', 'ms', 'female', '741 Poplar Place, Philadelphia, PA 19131');

-- Insert Student Roles
INSERT INTO student_roles (contact_id, year, program, track, track_detail, status, machzor, start_date, end_date, is_active) VALUES
(1, '2024-2025', 'LH', 'Alef', 'Full Year', 'Student', '10', '2024-09-01', '2025-06-15', true),
(2, '2024-2025', 'LLC', 'Bet', 'Full Year', 'Student', '9.5', '2024-09-01', '2025-06-15', true),
(3, '2024-2025', 'ML', 'Gimmel', 'Fall', 'Student', '10.5', '2024-09-01', '2025-01-15', false),
(4, '2024-2025', 'Kollel', 'Dalet', 'Full Year', 'Student', '8.5', '2024-09-01', '2025-06-15', true),
(5, '2024-2025', 'Madrich', 'Heh', 'Spring', 'Staff', '9', '2025-01-15', '2025-06-15', true);

-- Insert Contact Roles
INSERT INTO contact_roles (contact_id, role_name, is_active, start_date, notes) VALUES
(6, 'Parent', true, '2024-09-01', 'Parent of student'),
(7, 'Board Member', true, '2024-01-01', 'Active board member'),
(8, 'Alumni', true, '2020-06-15', 'Graduate from 2020'),
(9, 'Donor', true, '2023-01-01', 'Regular contributor'),
(10, 'Volunteer', true, '2024-03-01', 'Event volunteer');

-- Insert Relationships
INSERT INTO relationships (contact_id, related_contact_id, relationship_type, is_active, notes) VALUES
(6, 1, 'mother', true, 'Mother of David Cohen'),
(6, 2, 'mother', true, 'Mother of Sarah Goldberg'),
(7, 3, 'father', true, 'Father of Michael Rosenberg'),
(8, 4, 'spouse', true, 'Married couple'),
(9, 5, 'grandmother', true, 'Grandmother of Jonathan Katz');

-- Insert Pledges (each contact gets a pledge in all three categories)
INSERT INTO pledge (contact_id, category_id, pledge_date, description, original_amount, currency, total_paid, balance, original_amount_usd, total_paid_usd, balance_usd, is_active, notes) VALUES
-- Contact 1 pledges
(1, 1, '2024-09-01', 'Annual donation pledge', 5000.00, 'USD', 2000.00, 3000.00, 5000.00, 2000.00, 3000.00, true, 'Paying in monthly installments'),
(1, 2, '2024-09-15', 'Miscellaneous fees', 250.00, 'USD', 250.00, 0.00, 250.00, 250.00, 0.00, true, 'Registration fees - paid in full'),
(1, 3, '2024-08-01', 'Tuition for 2024-2025', 18000.00, 'USD', 9000.00, 9000.00, 18000.00, 9000.00, 9000.00, true, 'Semester payment plan'),

-- Contact 2 pledges
(2, 1, '2024-10-01', 'Scholarship fund donation', 2500.00, 'USD', 1000.00, 1500.00, 2500.00, 1000.00, 1500.00, true, 'Quarterly payments'),
(2, 2, '2024-09-01', 'Activity fees', 150.00, 'USD', 150.00, 0.00, 150.00, 150.00, 0.00, true, 'Paid upfront'),
(2, 3, '2024-08-15', 'Program tuition', 15000.00, 'USD', 7500.00, 7500.00, 15000.00, 7500.00, 7500.00, true, 'Two-payment plan'),

-- Contact 3 pledges
(3, 1, '2024-11-01', 'Building fund contribution', 10000.00, 'USD', 3000.00, 7000.00, 10000.00, 3000.00, 7000.00, true, 'Large donor - installment plan'),
(3, 2, '2024-09-10', 'Lab fees', 300.00, 'USD', 300.00, 0.00, 300.00, 300.00, 0.00, true, 'One-time payment'),
(3, 3, '2024-08-01', 'Medical program tuition', 22000.00, 'USD', 11000.00, 11000.00, 22000.00, 11000.00, 11000.00, true, 'Bi-annual payments'),

-- Contact 4 pledges
(4, 1, '2024-09-15', 'Annual giving campaign', 1500.00, 'USD', 500.00, 1000.00, 1500.00, 500.00, 1000.00, true, 'Monthly donor'),
(4, 2, '2024-10-01', 'Book fees', 200.00, 'USD', 100.00, 100.00, 200.00, 100.00, 100.00, true, 'Partial payment made'),
(4, 3, '2024-08-01', 'Kollel program fees', 12000.00, 'USD', 4000.00, 8000.00, 12000.00, 4000.00, 8000.00, true, 'Quarterly plan'),

-- Contact 5 pledges
(5, 1, '2024-12-01', 'End of year donation', 750.00, 'USD', 0.00, 750.00, 750.00, 0.00, 750.00, true, 'Pledged for year-end'),
(5, 2, '2024-09-01', 'Staff development fees', 100.00, 'USD', 100.00, 0.00, 100.00, 100.00, 0.00, true, 'Training costs covered'),
(5, 3, '2024-01-15', 'Spring program tuition', 8000.00, 'USD', 4000.00, 4000.00, 8000.00, 4000.00, 4000.00, true, 'Half paid, half pending'),

-- Contact 6 pledges (Parent)
(6, 1, '2024-09-01', 'Parent donation', 3000.00, 'USD', 1500.00, 1500.00, 3000.00, 1500.00, 1500.00, true, 'Supporting children education'),
(6, 2, '2024-09-01', 'Parent association fees', 75.00, 'USD', 75.00, 0.00, 75.00, 75.00, 0.00, true, 'Annual membership'),
(6, 3, '2024-08-01', 'Children tuition support', 5000.00, 'USD', 2500.00, 2500.00, 5000.00, 2500.00, 2500.00, true, 'Supporting multiple children'),

-- Contact 7 pledges (Board Member)
(7, 1, '2024-07-01', 'Board member annual pledge', 15000.00, 'USD', 7500.00, 7500.00, 15000.00, 7500.00, 7500.00, true, 'Leadership giving'),
(7, 2, '2024-09-01', 'Board meeting expenses', 500.00, 'USD', 200.00, 300.00, 500.00, 200.00, 300.00, true, 'Meeting and travel costs'),
(7, 3, '2024-08-01', 'Scholarship sponsorship', 20000.00, 'USD', 10000.00, 10000.00, 20000.00, 10000.00, 10000.00, true, 'Full scholarship sponsor'),

-- Contact 8 pledges (Alumni)
(8, 1, '2024-06-01', 'Alumni annual fund', 1000.00, 'USD', 1000.00, 0.00, 1000.00, 1000.00, 0.00, true, 'Grateful graduate'),
(8, 2, '2024-10-01', 'Alumni event fees', 50.00, 'USD', 50.00, 0.00, 50.00, 50.00, 0.00, true, 'Reunion attendance'),
(8, 3, '2024-09-01', 'Mentorship program support', 2000.00, 'USD', 500.00, 1500.00, 2000.00, 500.00, 1500.00, true, 'Supporting current students'),

-- Contact 9 pledges (Donor)
(9, 1, '2024-01-01', 'Major donor annual pledge', 25000.00, 'USD', 12500.00, 12500.00, 25000.00, 12500.00, 12500.00, true, 'Major benefactor'),
(9, 2, '2024-11-01', 'Special events sponsorship', 1000.00, 'USD', 0.00, 1000.00, 1000.00, 0.00, 1000.00, true, 'Upcoming gala sponsor'),
(9, 3, '2024-08-01', 'Endowment fund contribution', 50000.00, 'USD', 16666.67, 33333.33, 50000.00, 16666.67, 33333.33, true, 'Three-year commitment'),

-- Contact 10 pledges (Volunteer)
(10, 1, '2024-03-01', 'Volunteer appreciation fund', 500.00, 'USD', 250.00, 250.00, 500.00, 250.00, 250.00, true, 'Volunteer giving back'),
(10, 2, '2024-09-01', 'Volunteer training costs', 25.00, 'USD', 25.00, 0.00, 25.00, 25.00, 0.00, true, 'Training workshop'),
(10, 3, '2024-10-01', 'Student support fund', 800.00, 'USD', 200.00, 600.00, 800.00, 200.00, 600.00, true, 'Helping students in need');

-- Insert Payment Plans
INSERT INTO payment_plan (pledge_id, plan_name, frequency, total_planned_amount, currency, installment_amount, number_of_installments, start_date, end_date, next_payment_date, installments_paid, total_paid, remaining_amount, plan_status, auto_renew, notes) VALUES
-- Payment plans for various pledges
(1, 'Monthly Donation Plan', 'monthly', 5000.00, 'USD', 416.67, 12, '2024-09-01', '2025-08-01', '2025-01-01', 5, 2000.00, 3000.00, 'active', true, 'Regular monthly giving'),
(3, 'Semester Tuition Plan', 'biannual', 18000.00, 'USD', 9000.00, 2, '2024-08-01', '2025-01-01', '2025-01-01', 1, 9000.00, 9000.00, 'active', false, 'Two semester payments'),
(4, 'Quarterly Donation Plan', 'quarterly', 2500.00, 'USD', 625.00, 4, '2024-10-01', '2025-07-01', '2025-01-01', 2, 1250.00, 1250.00, 'active', true, 'Quarterly giving schedule'),
(7, 'Building Fund Plan', 'monthly', 10000.00, 'USD', 1000.00, 10, '2024-11-01', '2025-08-01', '2025-01-01', 3, 3000.00, 7000.00, 'active', false, 'Major gift installments'),
(9, 'Bi-annual Tuition Plan', 'biannual', 22000.00, 'USD', 11000.00, 2, '2024-08-01', '2025-01-01', '2025-01-01', 1, 11000.00, 11000.00, 'active', false, 'Medical program payments'),
(13, 'Monthly Parent Support', 'monthly', 3000.00, 'USD', 250.00, 12, '2024-09-01', '2025-08-01', '2025-01-01', 6, 1500.00, 1500.00, 'active', true, 'Parent monthly support'),
(16, 'Board Member Annual Plan', 'biannual', 15000.00, 'USD', 7500.00, 2, '2024-07-01', '2025-01-01', '2025-01-01', 1, 7500.00, 7500.00, 'active', false, 'Leadership giving plan'),
(25, 'Major Donor Plan', 'quarterly', 25000.00, 'USD', 6250.00, 4, '2024-01-01', '2024-10-01', '2025-01-01', 2, 12500.00, 12500.00, 'active', true, 'Major benefactor quarterly'),
(27, 'Endowment Plan', 'annual', 50000.00, 'USD', 16666.67, 3, '2024-08-01', '2027-08-01', '2025-08-01', 1, 16666.67, 33333.33, 'active', false, 'Three-year endowment commitment');

-- Insert Payments
INSERT INTO payment (pledge_id, payment_plan_id, amount, currency, amount_usd, payment_date, received_date, processed_date, payment_method, payment_status, reference_number, check_number, receipt_number, receipt_type, receipt_issued, receipt_issued_date, notes, created_by, last_modified_by) VALUES
-- Payments for Contact 1
(1, 1, 416.67, 'USD', 416.67, '2024-09-01', '2024-09-01', '2024-09-02', 'credit_card', 'completed', 'CC-2024-09-001', NULL, 'RCP-001', 'receipt', true, '2024-09-02', 'First monthly payment', 1, 1),
(1, 1, 416.67, 'USD', 416.67, '2024-10-01', '2024-10-01', '2024-10-02', 'credit_card', 'completed', 'CC-2024-10-001', NULL, 'RCP-002', 'receipt', true, '2024-10-02', 'Second monthly payment', 1, 1),
(1, 1, 416.67, 'USD', 416.67, '2024-11-01', '2024-11-01', '2024-11-02', 'credit_card', 'completed', 'CC-2024-11-001', NULL, 'RCP-003', 'receipt', true, '2024-11-02', 'Third monthly payment', 1, 1),
(1, 1, 416.67, 'USD', 416.67, '2024-12-01', '2024-12-01', '2024-12-02', 'credit_card', 'completed', 'CC-2024-12-001', NULL, 'RCP-004', 'receipt', true, '2024-12-02', 'Fourth monthly payment', 1, 1),
(1, 1, 333.32, 'USD', 333.32, '2025-01-01', '2025-01-01', '2025-01-02', 'credit_card', 'completed', 'CC-2025-01-001', NULL, 'RCP-005', 'receipt', true, '2025-01-02', 'Fifth monthly payment (adjusted)', 1, 1),
(2, NULL, 250.00, 'USD', 250.00, '2024-09-15', '2024-09-15', '2024-09-16', 'check', 'completed', NULL, 'CHK-001', 'RCP-006', 'receipt', true, '2024-09-16', 'Registration fees payment', 1, 1),
(3, 2, 9000.00, 'USD', 9000.00, '2024-08-01', '2024-08-01', '2024-08-02', 'bank_transfer', 'completed', 'BT-2024-08-001', NULL, 'RCP-007', 'invoice', true, '2024-08-02', 'First semester tuition', 1, 1),

-- Payments for Contact 2
(4, 3, 625.00, 'USD', 625.00, '2024-10-01', '2024-10-01', '2024-10-02', 'credit_card', 'completed', 'CC-2024-10-002', NULL, 'RCP-008', 'receipt', true, '2024-10-02', 'First quarterly donation', 2, 2),
(4, 3, 625.00, 'USD', 625.00, '2025-01-01', '2025-01-01', '2025-01-02', 'credit_card', 'completed', 'CC-2025-01-002', NULL, 'RCP-009', 'receipt', true, '2025-01-02', 'Second quarterly donation', 2, 2),
(5, NULL, 150.00, 'USD', 150.00, '2024-09-01', '2024-09-01', '2024-09-02', 'cash', 'completed', 'CASH-001', NULL, 'RCP-010', 'receipt', true, '2024-09-02', 'Activity fees cash payment', 2, 2),
(6, NULL, 7500.00, 'USD', 7500.00, '2024-08-15', '2024-08-15', '2024-08-16', 'wire_transfer', 'completed', 'WT-2024-08-001', NULL, 'RCP-011', 'invoice', true, '2024-08-16', 'First tuition payment', 2, 2),

-- Payments for Contact 3
(7, 4, 1000.00, 'USD', 1000.00, '2024-11-01', '2024-11-01', '2024-11-02', 'check', 'completed', NULL, 'CHK-002', 'RCP-012', 'receipt', true, '2024-11-02', 'Building fund - month 1', 3, 3),
(7, 4, 1000.00, 'USD', 1000.00, '2024-12-01', '2024-12-01', '2024-12-02', 'check', 'completed', NULL, 'CHK-003', 'RCP-013', 'receipt', true, '2024-12-02', 'Building fund - month 2', 3, 3),
(7, 4, 1000.00, 'USD', 1000.00, '2025-01-01', '2025-01-01', '2025-01-02', 'check', 'completed', NULL, 'CHK-004', 'RCP-014', 'receipt', true, '2025-01-02', 'Building fund - month 3', 3, 3),
(8, NULL, 300.00, 'USD', 300.00, '2024-09-10', '2024-09-10', '2024-09-11', 'credit_card', 'completed', 'CC-2024-09-003', NULL, 'RCP-015', 'receipt', true, '2024-09-11', 'Lab fees payment', 3, 3),
(9, 5, 11000.00, 'USD', 11000.00, '2024-08-01', '2024-08-01', '2024-08-02', 'bank_transfer', 'completed', 'BT-2024-08-002', NULL, 'RCP-016', 'invoice', true, '2024-08-02', 'First semester medical tuition', 3, 3),

-- Payments for Contact 6 (Parent)
(13, 6, 250.00, 'USD', 250.00, '2024-09-01', '2024-09-01', '2024-09-02', 'paypal', 'completed', 'PP-2024-09-001', NULL, 'RCP-017', 'receipt', true, '2024-09-02', 'Parent support - Sept', 6, 6),
(13, 6, 250.00, 'USD', 250.00, '2024-10-01', '2024-10-01', '2024-10-02', 'paypal', 'completed', 'PP-2024-10-001', NULL, 'RCP-018', 'receipt', true, '2024-10-02', 'Parent support - Oct', 6, 6),
(13, 6, 250.00, 'USD', 250.00, '2024-11-01', '2024-11-01', '2024-11-02', 'paypal', 'completed', 'PP-2024-11-001', NULL, 'RCP-019', 'receipt', true, '2024-11-02', 'Parent support - Nov', 6, 6),
(13, 6, 250.00, 'USD', 250.00, '2024-12-01', '2024-12-01', '2024-12-02', 'paypal', 'completed', 'PP-2024-12-001', NULL, 'RCP-020', 'receipt', true, '2024-12-02', 'Parent support - Dec', 6, 6),
(13, 6, 250.00, 'USD', 250.00, '2025-01-01', '2025-01-01', '2025-01-02', 'paypal', 'completed', 'PP-2025-01-001', NULL, 'RCP-021', 'receipt', true, '2025-01-02', 'Parent support - Jan', 6, 6),
(13, 6, 250.00, 'USD', 250.00, '2025-02-01', '2025-02-01', '2025-02-02', 'paypal', 'completed', 'PP-2025-02-001', NULL, 'RCP-022', 'receipt', true, '2025-02-02', 'Parent support - Feb', 6, 6),
(14, NULL, 75.00, 'USD', 75.00, '2024-09-01', '2024-09-01', '2024-09-02', 'credit_card', 'completed', 'CC-2024-09-004', NULL, 'RCP-023', 'receipt', true, '2024-09-02', 'Parent association membership', 6, 6),

-- Payments for Contact 7 (Board Member)
(16, 7, 7500.00, 'USD', 7500.00, '2024-07-01', '2024-07-01', '2024-07-02', 'wire_transfer', 'completed', 'WT-2024-07-001', NULL, 'RCP-024', 'invoice', true, '2024-07-02', 'Board member first payment', 7, 7),
(18, NULL, 10000.00, 'USD', 10000.00, '2024-08-01', '2024-08-01', '2024-08-02', 'check', 'completed', NULL, 'CHK-005', 'RCP-025', 'invoice', true, '2024-08-02', 'Scholarship sponsorship first payment', 7, 7),

-- Payments for Contact 9 (Major Donor)
(25, 8, 6250.00, 'USD', 6250.00, '2024-01-01', '2024-01-01', '2024-01-02', 'wire_transfer', 'completed', 'WT-2024-01-001', NULL, 'RCP-026', 'invoice', true, '2024-01-02', 'Q1 major donation', 9, 9),
(25, 8, 6250.00, 'USD', 6250.00, '2024-04-01', '2024-04-01', '2024-04-02', 'wire_transfer', 'completed', 'WT-2024-04-001', NULL, 'RCP-027', 'invoice', true, '2024-04-02', 'Q2 major donation', 9, 9),
(27, 9, 16666.67, 'USD', 16666.67, '2024-08-01', '2024-08-01', '2024-08-02', 'wire_transfer', 'completed', 'WT-2024-08-003', NULL, 'RCP-028', 'invoice', true, '2024-08-02', 'Endowment year 1', 9, 9),

-- Some pending/failed payments for realism
(10, NULL, 100.00, 'USD', 100.00, '2024-12-01', '2024-12-01', NULL, 'credit_card', 'pending', 'CC-2024-12-PEND', NULL, NULL, NULL, false, NULL, 'Payment processing', 4, 4),
(11, NULL, 4000.00, 'USD', 4000.00, '2024-11-15', '2024-11-15', NULL, 'bank_transfer', 'failed', 'BT-2024-11-FAIL', NULL, NULL, NULL, false, NULL, 'Insufficient funds', 4, 4),
(28, NULL, 200.00, 'USD', 200.00, '2024-12-15', NULL, NULL, 'credit_card', 'processing', 'CC-2024-12-PROC', NULL, NULL, NULL, false, NULL, 'Credit card processing', 10, 10);

-- Insert some audit log entries
INSERT INTO audit_log (table_name, record_id, action, field_name, old_value, new_value, changed_by, ip_address, user_agent) VALUES
('payment', 1, 'CREATE', NULL, NULL, NULL, 1, '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
('payment', 2, 'CREATE', NULL, NULL, NULL, 1, '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
('pledge', 1, 'UPDATE', 'total_paid', '1666.68', '2000.00', 1, '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
('pledge', 1, 'UPDATE', 'balance', '3333.32', '3000.00', 1, '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
('payment_plan', 1, 'UPDATE', 'installments_paid', '4', '5', 1, '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
('contact', 5, 'UPDATE', 'phone', '+1-555-0105', '+1-555-0105-NEW', 5, '10.0.0.50', 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X)');