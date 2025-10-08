# Fix Dashboard Statements Date Range Issue

## Problem
In the dashboard's statement section, when entering a date range, Outstanding Balances and Payment History data are not being updated accordingly. The Outstanding Balances and summary (Total Owed, Total Paid, etc.) show all-time data instead of being filtered by the date range.

## Solution
Modify the API route to calculate balances and summaries as of the end date of the range, considering payments made up to that date.

## Steps
- [x] Update outstandingBalances query to calculate balance as of endDate
- [x] Update summary query to calculate totals based on payments up to endDate
- [x] Handle case when no date range is provided (use all-time data)
- [x] Update monthly payments chart to show daily data when date range < 2 months
- [x] Test the changes to ensure data updates correctly with date range
