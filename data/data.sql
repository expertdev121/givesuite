-- Sample Data SQL Dump for Donation/Payment Management System with Mixed Currencies

-- Insert Categories (unchanged)
INSERT INTO category (name, description, is_active) VALUES
('Donation', 'General charitable donations', true),
('Tuition', 'Educational tuition fees', true),
('Miscellaneous', 'Miscellaneous fees and charges', true);

-- Insert Contacts (unchanged)
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

-- Insert Student Roles (unchanged)
INSERT INTO student_roles (contact_id, year, program, track, track_detail, status, machzor, start_date, end_date, is_active) VALUES
(1, '2024-2025', 'LH', 'Alef', 'Full Year', 'Student', '10', '2024-09-01', '2025-06-15', true),
(2, '2024-2025', 'LLC', 'Bet', 'Full Year', 'Student', '9.5', '2024-09-01', '2025-06-15', true),
(3, '2024-2025', 'ML', 'Gimmel', 'Fall', 'Student', '10.5', '2024-09-01', '2025-01-15', false),
(4, '2024-2025', 'Kollel', 'Dalet', 'Full Year', 'Student', '8.5', '2024-09-01', '2025-06-15', true),
(5, '2024-2025', 'Madrich', 'Heh', 'Spring', 'Staff', '9', '2025-01-15', '2025-06-15', true);

-- Insert Contact Roles (unchanged)
INSERT INTO contact_roles (contact_id, role_name, is_active, start_date, notes) VALUES
(6, 'Parent', true, '2024-09-01', 'Parent of student'),
(7, 'Board Member', true, '2024-01-01', 'Active board member'),
(8, 'Alumni', true, '2020-06-15', 'Graduate from 2020'),
(9, 'Donor', true, '2023-01-01', 'Regular contributor'),
(10, 'Volunteer', true, '2024-03-01', 'Event volunteer');

-- Insert Relationships (unchanged)
INSERT INTO relationships (contact_id, related_contact_id, relationship_type, is_active, notes) VALUES
(6, 1, 'mother', true, 'Mother of David Cohen'),
(6, 2, 'mother', true, 'Mother of Sarah Goldberg'),
(7, 3, 'father', true, 'Father of Michael Rosenberg'),
(8, 4, 'spouse', true, 'Married couple'),
(9, 5, 'grandmother', true, 'Grandmother of Jonathan Katz');

-- Insert Pledges (with mixed currencies)
INSERT INTO pledge (contact_id, category_id, pledge_date, description, original_amount, currency, total_paid, balance, original_amount_usd, total_paid_usd, balance_usd, is_active, notes) VALUES
-- Contact 1 pledges
(1, 1, '2024-09-01', 'Alef 2004/05', 5000.00, 'EUR', 2000.00, 3000.00, 5450.00, 2180.00, 3270.00, true, 'Paying in monthly installments'), -- EUR: 5000 * 1.09 = 5450 USD
(1, 2, '2024-09-15', 'Alef 2005/06', 250.00, 'GBP', 250.00, 0.00, 317.50, 317.50, 0.00, true, 'Registration fees - paid in full'), -- GBP: 250 * 1.27 = 317.50 USD
(1, 3, '2024-08-01', 'Alef 2006/07', 18000.00, 'ILS', 9000.00, 9000.00, 4860.00, 2430.00, 2430.00, true, 'Semester payment plan'), -- ILS: 18000 * 0.27 = 4860 USD
-- Contact 2 pledges
(2, 1, '2024-10-01', 'Alef 2007/08', 2500.00, 'CAD', 1000.00, 1500.00, 1825.00, 730.00, 1095.00, true, 'Quarterly payments'), -- CAD: 2500 * 0.73 = 1825 USD
(2, 2, '2024-09-01', 'Alef 2008/09', 150.00, 'AUD', 150.00, 0.00, 99.00, 99.00, 0.00, true, 'Paid upfront'), -- AUD: 150 * 0.66 = 99 USD
(2, 3, '2024-08-15', 'Alef 2009/10', 15000.00, 'JPY', 7500.00, 7500.00, 100.50, 50.25, 50.25, true, 'Two-payment plan'), -- JPY: 15000 * 0.0067 = 100.50 USD
-- Contact 3 pledges
(3, 1, '2024-11-01', 'Alef 2010/11', 10000.00, 'ZAR', 3000.00, 7000.00, 540.00, 162.00, 378.00, true, 'Large donor - installment plan'), -- ZAR: 10000 * 0.054 = 540 USD
(3, 2, '2024-09-10', 'Alef 2011/12', 300.00, 'USD', 300.00, 0.00, 300.00, 300.00, 0.00, true, 'One-time payment'), -- USD: 300 * 1 = 300 USD
(3, 3, '2024-08-01', 'Alef 2012/13', 22000.00, 'EUR', 11000.00, 11000.00, 23980.00, 11990.00, 11990.00, true, 'Bi-annual payments'), -- EUR: 22000 * 1.09 = 23980 USD
-- Contact 4 pledges
(4, 1, '2024-09-15', 'Alef 2013/14', 1500.00, 'GBP', 500.00, 1000.00, 1905.00, 635.00, 1270.00, true, 'Monthly donor'), -- GBP: 1500 * 1.27 = 1905 USD
(4, 2, '2024-10-01', 'Alef 2013/14', 200.00, 'CAD', 100.00, 100.00, 146.00, 73.00, 73.00, true, 'Partial payment made'), -- CAD: 200 * 0.73 = 146 USD
(4, 3, '2024-08-01', 'Alef 2014/15', 12000.00, 'ILS', 4000.00, 8000.00, 3240.00, 1080.00, 2160.00, true, 'Quarterly plan'), -- ILS: 12000 * 0.27 = 3240 USD
-- Contact 5 pledges
(5, 1, '2024-12-01', 'Alef 2014/15', 750.00, 'AUD', 0.00, 750.00, 495.00, 0.00, 495.00, true, 'Pledged for year-end'), -- AUD: 750 * 0.66 = 495 USD
(5, 2, '2024-09-01', 'Alef 2015/16', 100.00, 'ZAR', 100.00, 0.00, 5.40, 5.40, 0.00, true, 'Training costs covered'), -- ZAR: 100 * 0.054 = 5.40 USD
(5, 3, '2024-01-15', 'Alef 2015/16', 8000.00, 'JPY', 4000.00, 4000.00, 53.60, 26.80, 26.80, true, 'Half paid, half pending'), -- JPY: 8000 * 0.0067 = 53.60 USD
-- Contact 6 pledges (Parent)
(6, 1, '2024-09-01', 'Alef 2016/17', 3000.00, 'EUR', 1500.00, 1500.00, 3270.00, 1635.00, 1635.00, true, 'Supporting children education'), -- EUR: 3000 * 1.09 = 3270 USD
(6, 2, '2024-09-01', 'Alef 2020/21', 75.00, 'GBP', 75.00, 0.00, 95.25, 95.25, 0.00, true, 'Annual membership'), -- GBP: 75 * 1.27 = 95.25 USD
(6, 3, '2024-08-01', 'Alef 2022/23', 5000.00, 'CAD', 2500.00, 2500.00, 3650.00, 1825.00, 1825.00, true, 'Supporting multiple children'), -- CAD: 5000 * 0.73 = 3650 USD
-- Contact 7 pledges (Board Member)
(7, 1, '2024-07-01', 'Alef 2019/20', 15000.00, 'USD', 7500.00, 7500.00, 15000.00, 7500.00, 7500.00, true, 'Leadership giving'), -- USD: 15000 * 1 = 15000 USD
(7, 2, '2024-09-01', 'Alef 2019/20', 500.00, 'ILS', 200.00, 300.00, 135.00, 54.00, 81.00, true, 'Meeting and travel costs'), -- ILS: 500 * 0.27 = 135 USD
(7, 3, '2024-08-01', 'Alef 2020/21', 20000.00, 'EUR', 10000.00, 10000.00, 21800.00, 10900.00, 10900.00, true, 'Full scholarship sponsor'), -- EUR: 20000 * 1.09 = 21800 USD
-- Contact 8 pledges (Alumni)
(8, 1, '2024-06-01', 'Alef 2022/23', 1000.00, 'AUD', 1000.00, 0.00, 660.00, 660.00, 0.00, true, 'Grateful graduate'), -- AUD: 1000 * 0.66 = 660 USD
(8, 2, '2024-10-01', 'Alef 2023/24', 50.00, 'ZAR', 50.00, 0.00, 2.70, 2.70, 0.00, true, 'Reunion attendance'), -- ZAR: 50 * 0.054 = 2.70 USD
(8, 3, '2024-09-01', 'Alef 2024/25', 2000.00, 'JPY', 500.00, 1500.00, 13.40, 3.35, 10.05, true, 'Supporting current students'), -- JPY: 2000 * 0.0067 = 13.40 USD
-- Contact 9 pledges (Donor)
(9, 1, '2024-01-01', 'Alumni Shabbaton: Israel 2016', 25000.00, 'GBP', 12500.00, 12500.00, 31750.00, 15875.00, 15875.00, true, 'Major benefactor'), -- GBP: 25000 * 1.27 = 31750 USD
(9, 2, '2024-11-01', 'Alumni Shabbaton: Israel 2017', 1000.00, 'CAD', 0.00, 1000.00, 730.00, 0.00, 730.00, true, 'Upcoming gala sponsor'), -- CAD: 1000 * 0.73 = 730 USD
(9, 3, '2024-08-01', 'Alumni Shabbaton: Queens 2016', 50000.00, 'USD', 16666.67, 33333.33, 50000.00, 16666.67, 33333.33, true, 'Three-year commitment'), -- USD: 50000 * 1 = 50000 USD
-- Contact 10 pledges (Volunteer)
(10, 1, '2024-03-01', 'Banquet 2019 - General Sponsorship', 500.00, 'ILS', 250.00, 250.00, 135.00, 67.50, 67.50, true, 'Volunteer giving back'), -- ILS: 500 * 0.27 = 135 USD
(10, 2, '2024-09-01', 'Banquet 2019 - Silver Sponsorship', 25.00, 'EUR', 25.00, 0.00, 27.25, 27.25, 0.00, true, 'Training workshop'), -- EUR: 25 * 1.09 = 27.25 USD
(10, 3, '2024-10-01', 'Basketball Court Rental', 800.00, 'AUD', 200.00, 600.00, 528.00, 132.00, 396.00, true, 'Helping students in need'); -- AUD: 800 * 0.66 = 528 USD

-- Insert Payment Plans (with mixed currencies)
INSERT INTO payment_plan (pledge_id, plan_name, frequency, total_planned_amount, currency, installment_amount, number_of_installments, start_date, end_date, next_payment_date, installments_paid, total_paid, remaining_amount, plan_status, auto_renew, notes) VALUES
(1, 'Monthly Donation Plan', 'monthly', 5000.00, 'EUR', 416.67, 12, '2024-09-01', '2025-08-01', '2025-01-01', 5, 2000.00, 3000.00, 'active', true, 'Regular monthly giving'), -- EUR: 2000 * 1.09 = 2180 USD
(3, 'Semester Tuition Plan', 'biannual', 18000.00, 'ILS', 9000.00, 2, '2024-08-01', '2025-01-01', '2025-01-01', 1, 9000.00, 9000.00, 'active', false, 'Two semester payments'), -- ILS: 9000 * 0.27 = 2430 USD
(4, 'Quarterly Donation Plan', 'quarterly', 2500.00, 'CAD', 625.00, 4, '2024-10-01', '2025-07-01', '2025-01-01', 2, 1250.00, 1250.00, 'active', true, 'Quarterly giving schedule'), -- CAD: 1250 * 0.73 = 912.50 USD (corrected below)
(7, 'Building Fund Plan', 'monthly', 10000.00, 'ZAR', 1000.00, 10, '2024-11-01', '2025-08-01', '2025-01-01', 3, 3000.00, 7000.00, 'active', false, 'Major gift installments'), -- ZAR: 3000 * 0.054 = 162 USD
(9, 'Bi-annual Tuition Plan', 'biannual', 22000.00, 'EUR', 11000.00, 2, '2024-08-01', '2025-01-01', '2025-01-01', 1, 11000.00, 11000.00, 'active', false, 'Medical program payments'), -- EUR: 11000 * 1.09 = 11990 USD
(13, 'Monthly Parent Support', 'monthly', 3000.00, 'EUR', 250.00, 12, '2024-09-01', '2025-08-01', '2025-01-01', 6, 1500.00, 1500.00, 'active', true, 'Parent monthly support'), -- EUR: 1500 * 1.09 = 1635 USD
(16, 'Board Member Annual Plan', 'biannual', 15000.00, 'USD', 7500.00, 2, '2024-07-01', '2025-01-01', '2025-01-01', 1, 7500.00, 7500.00, 'active', false, 'Leadership giving plan'), -- USD: 7500 * 1 = 7500 USD
(25, 'Major Donor Plan', 'quarterly', 25000.00, 'GBP', 6250.00, 4, '2024-01-01', '2024-10-01', '2025-01-01', 2, 12500.00, 12500.00, 'active', true, 'Major benefactor quarterly'), -- GBP: 12500 * 1.27 = 15875 USD
(27, 'Endowment Plan', 'annual', 50000.00, 'USD', 16666.67, 3, '2024-08-01', '2027-08-01', '2025-08-01', 1, 16666.67, 33333.33, 'active', false, 'Three-year endowment commitment'); -- USD: 16666.67 * 1 = 16666.67 USD

-- Insert Payments (with mixed currencies and exchange_rate)
INSERT INTO payment (pledge_id, payment_plan_id, amount, currency, amount_usd, payment_date, received_date, processed_date, payment_method, payment_status, reference_number, check_number, receipt_number, receipt_type, receipt_issued, receipt_issued_date, notes, created_by, last_modified_by, exchange_rate) VALUES
-- Payments for Contact 1
(1, 1, 416.67, 'EUR', 454.17, '2024-09-01', '2024-09-01', '2024-09-02', 'credit_card', 'completed', 'CC-2024-09-001', NULL, 'RCP-001', 'receipt', true, '2024-09-02', 'First monthly payment', 1, 1, 1.09),
(1, 1, 416.67, 'EUR', 454.17, '2024-10-01', '2024-10-01', '2024-10-02', 'credit_card', 'completed', 'CC-2024-10-001', NULL, 'RCP-002', 'receipt', true, '2024-10-02', 'Second monthly payment', 1, 1, 1.09),
(1, 1, 416.67, 'EUR', 454.17, '2024-11-01', '2024-11-01', '2024-11-02', 'credit_card', 'completed', 'CC-2024-11-001', NULL, 'RCP-003', 'receipt', true, '2024-11-02', 'Third monthly payment', 1, 1, 1.09),
(1, 1, 416.67, 'EUR', 454.17, '2024-12-01', '2024-12-01', '2024-12-02', 'credit_card', 'completed', 'CC-2024-12-001', NULL, 'RCP-004', 'receipt', true, '2024-12-02', 'Fourth monthly payment', 1, 1, 1.09),

-- Payments for Contact 1 (continued)
(2, NULL, 250.00, 'GBP', 317.50, '2024-09-15', '2024-09-15', '2024-09-16', 'check', 'completed', NULL, 'CHK-001', 'RCP-006', 'receipt', true, '2024-09-16', 'Registration fees payment', 1, 1, 1.27),
(3, 2, 9000.00, 'ILS', 2430.00, '2024-08-01', '2024-08-01', '2024-08-02', 'bank_transfer', 'completed', 'BT-2024-08-001', NULL, 'RCP-007', 'invoice', true, '2024-08-02', 'First semester tuition', 1, 1, 0.27),
-- Payments for Contact 2
(4, 3, 625.00, 'CAD', 456.25, '2024-10-01', '2024-10-01', '2024-10-02', 'credit_card', 'completed', 'CC-2024-10-002', NULL, 'RCP-008', 'receipt', true, '2024-10-02', 'First quarterly donation', 2, 2, 0.73),
(4, 3, 625.00, 'CAD', 456.25, '2025-01-01', '2025-01-01', '2025-01-02', 'credit_card', 'completed', 'CC-2025-01-002', NULL, 'RCP-009', 'receipt', true, '2025-01-02', 'Second quarterly donation', 2, 2, 0.73),
(5, NULL, 150.00, 'AUD', 99.00, '2024-09-01', '2024-09-01', '2024-09-02', 'cash', 'completed', 'CASH-001', NULL, 'RCP-010', 'receipt', true, '2024-09-02', 'Activity fees cash payment', 2, 2, 0.66),
(6, NULL, 7500.00, 'JPY', 50.25, '2024-08-15', '2024-08-15', '2024-08-16', 'wire_transfer', 'completed', 'WT-2024-08-001', NULL, 'RCP-011', 'invoice', true, '2024-08-16', 'First tuition payment', 2, 2, 0.0067),
-- Payments for Contact 3
(7, 4, 1000.00, 'ZAR', 54.00, '2024-11-01', '2024-11-01', '2024-11-02', 'check', 'completed', NULL, 'CHK-002', 'RCP-012', 'receipt', true, '2024-11-02', 'Building fund - month 1', 3, 3, 0.054),
(7, 4, 1000.00, 'ZAR', 54.00, '2024-12-01', '2024-12-01', '2024-12-02', 'check', 'completed', NULL, 'CHK-003', 'RCP-013', 'receipt', true, '2024-12-02', 'Building fund - month 2', 3, 3, 0.054),
(7, 4, 1000.00, 'ZAR', 54.00, '2025-01-01', '2025-01-01', '2025-01-02', 'check', 'completed', NULL, 'CHK-004', 'RCP-014', 'receipt', true, '2025-01-02', 'Building fund - month 3', 3, 3, 0.054),
(8, NULL, 300.00, 'USD', 300.00, '2024-09-10', '2024-09-10', '2024-09-11', 'credit_card', 'completed', 'CC-2024-09-003', NULL, 'RCP-015', 'receipt', true, '2024-09-11', 'Lab fees payment', 3, 3, 1.00),
(9, 5, 11000.00, 'EUR', 11990.00, '2024-08-01', '2024-08-01', '2024-08-02', 'bank_transfer', 'completed', 'BT-2024-08-002', NULL, 'RCP-016', 'invoice', true, '2024-08-02', 'First semester medical tuition', 3, 3, 1.09),
-- Payments for Contact 6 (Parent)
(13, 6, 250.00, 'EUR', 272.50, '2024-09-01', '2024-09-01', '2024-09-02', 'paypal', 'completed', 'PP-2024-09-001', NULL, 'RCP-017', 'receipt', true, '2024-09-02', 'Parent support - Sept', 6, 6, 1.09),
(13, 6, 250.00, 'EUR', 272.50, '2024-10-01', '2024-10-01', '2024-10-02', 'paypal', 'completed', 'PP-2024-10-001', NULL, 'RCP-018', 'receipt', true, '2024-10-02', 'Parent support - Oct', 6, 6, 1.09),
(13, 6, 250.00, 'EUR', 272.50, '2024-11-01', '2024-11-01', '2024-11-02', 'paypal', 'completed', 'PP-2024-11-001', NULL, 'RCP-019', 'receipt', true, '2024-11-02', 'Parent support - Nov', 6, 6, 1.09),
(13, 6, 250.00, 'EUR', 272.50, '2024-12-01', '2024-12-01', '2024-12-02', 'paypal', 'completed', 'PP-2024-12-001', NULL, 'RCP-020', 'receipt', true, '2024-12-02', 'Parent support - Dec', 6, 6, 1.09),
(13, 6, 250.00, 'EUR', 272.50, '2025-01-01', '2025-01-01', '2025-01-02', 'paypal', 'completed', 'PP-2025-01-001', NULL, 'RCP-021', 'receipt', true, '2025-01-02', 'Parent support - Jan', 6, 6, 1.09),
(13, 6, 250.00, 'EUR', 272.50, '2025-02-01', '2025-02-01', '2025-02-02', 'paypal', 'completed', 'PP-2025-02-001', NULL, 'RCP-022', 'receipt', true, '2025-02-02', 'Parent support - Feb', 6, 6, 1.09),
(14, NULL, 75.00, 'GBP', 95.25, '2024-09-01', '2024-09-01', '2024-09-02', 'credit_card', 'completed', 'CC-2024-09-004', NULL, 'RCP-023', 'receipt', true, '2024-09-02', 'Parent association membership', 6, 6, 1.27),
-- Payments for Contact 7 (Board Member)
(16, 7, 7500.00, 'USD', 7500.00, '2024-07-01', '2024-07-01', '2024-07-02', 'wire_transfer', 'completed', 'WT-2024-07-001', NULL, 'RCP-024', 'invoice', true, '2024-07-02', 'Board member first payment', 7, 7, 1.00),
(18, NULL, 10000.00, 'EUR', 10900.00, '2024-08-01', '2024-08-01', '2024-08-02', 'check', 'completed', NULL, 'CHK-005', 'RCP-025', 'invoice', true, '2024-08-02', 'Scholarship sponsorship first payment', 7, 7, 1.09),
-- Payments for Contact 9 (Major Donor)
(25, 8, 6250.00, 'GBP', 7937.50, '2024-01-01', '2024-01-01', '2024-01-02', 'wire_transfer', 'completed', 'WT-2024-01-001', NULL, 'RCP-026', 'invoice', true, '2024-01-02', 'Q1 major donation', 9, 9, 1.27),
(25, 8, 6250.00, 'GBP', 7937.50, '2024-04-01', '2024-04-01', '2024-04-02', 'wire_transfer', 'completed', 'WT-2024-04-001', NULL, 'RCP-027', 'invoice', true, '2024-04-02', 'Q2 major donation', 9, 9, 1.27),
(27, 9, 16666.67, 'USD', 16666.67, '2024-08-01', '2024-08-01', '2024-08-02', 'wire_transfer', 'completed', 'WT-2024-08-003', NULL, 'RCP-028', 'invoice', true, '2024-08-02', 'Endowment year 1', 9, 9, 1.00),
-- Pending/failed payments
(10, NULL, 100.00, 'CAD', 73.00, '2024-12-01', '2024-12-01', NULL, 'credit_card', 'pending', 'CC-2024-12-PEND', NULL, NULL, NULL, false, NULL, 'Payment processing', 4, 4, 0.73),
(11, NULL, 4000.00, 'ILS', 1080.00, '2024-11-15', '2024-11-15', NULL, 'bank_transfer', 'failed', 'BT-2024-11-FAIL', NULL, NULL, NULL, false, NULL, 'Insufficient funds', 4, 4, 0.27),
(28, NULL, 200.00, 'AUD', 132.00, '2024-12-15', NULL, NULL, 'credit_card', 'processing', 'CC-2024-12-PROC', NULL, NULL, NULL, false, NULL, 'Credit card processing', 10, 10, 0.66);

-- Insert Audit Log Entries (unchanged)
INSERT INTO audit_log (table_name, record_id, action, field_name, old_value, new_value, changed_by, ip_address, user_agent) VALUES
('payment', 1, 'CREATE', NULL, NULL, NULL, 1, '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
('payment', 2, 'CREATE', NULL, NULL, NULL, 1, '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
('pledge', 1, 'UPDATE', 'total_paid', '1666.68', '2000.00', 1, '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
('pledge', 1, 'UPDATE', 'balance', '3333.32', '3000.00', 1, '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
('payment_plan', 1, 'UPDATE', 'installments_paid', '4', '5', 1, '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
('contact', 5, 'UPDATE', 'phone', '+1-555-0105', '+1-555-0105-NEW', 5, '10.0.0.50', 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X)');