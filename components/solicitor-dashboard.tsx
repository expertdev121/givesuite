"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Users,
  DollarSign,
  TrendingUp,
  UserPlus,
  AlertCircle,
  Award,
  Calculator,
  FileText,
} from "lucide-react";

const mockSolicitors = [
  {
    id: 1,
    contactId: 15,
    solicitorCode: "SOL001",
    status: "active" as const,
    commissionRate: "5.00",
    hireDate: "2024-01-15",
    terminationDate: null,
    notes: "Top performer",
    // Contact info
    firstName: "John",
    lastName: "Smith",
    email: "john.smith@org.com",
    phone: "+1-555-0201",
    // Performance metrics
    totalRaised: 45230.5,
    paymentsCount: 23,
    bonusEarned: 2261.53,
    lastActivity: "2024-12-01",
  },
  {
    id: 2,
    contactId: 16,
    solicitorCode: "SOL002",
    status: "active" as const,
    commissionRate: "4.50",
    hireDate: "2024-03-01",
    terminationDate: null,
    notes: "Specializes in major donors",
    firstName: "Maria",
    lastName: "Garcia",
    email: "maria.garcia@org.com",
    phone: "+1-555-0202",
    totalRaised: 78450.0,
    paymentsCount: 15,
    bonusEarned: 3922.5,
    lastActivity: "2024-11-28",
  },
  {
    id: 3,
    contactId: 17,
    solicitorCode: "SOL003",
    status: "inactive" as const,
    commissionRate: "3.00",
    hireDate: "2023-06-01",
    terminationDate: "2024-10-15",
    notes: "Left for personal reasons",
    firstName: "David",
    lastName: "Wilson",
    email: "david.wilson@org.com",
    phone: "+1-555-0203",
    totalRaised: 12800.0,
    paymentsCount: 8,
    bonusEarned: 384.0,
    lastActivity: "2024-10-15",
  },
];

const mockBonusRules = [
  {
    id: 1,
    solicitorId: 1,
    ruleName: "Standard Donation Bonus",
    bonusPercentage: "5.00",
    paymentType: "donation" as const,
    minAmount: "100.00",
    maxAmount: null,
    effectiveFrom: "2024-01-01",
    effectiveTo: null,
    isActive: true,
    priority: 1,
  },
  {
    id: 2,
    solicitorId: 1,
    ruleName: "Major Donor Bonus",
    bonusPercentage: "7.50",
    paymentType: "donation" as const,
    minAmount: "5000.00",
    maxAmount: null,
    effectiveFrom: "2024-01-01",
    effectiveTo: null,
    isActive: true,
    priority: 2,
  },
  {
    id: 3,
    solicitorId: 2,
    ruleName: "Tuition Collection Bonus",
    bonusPercentage: "3.00",
    paymentType: "tuition" as const,
    minAmount: "500.00",
    maxAmount: "1000.00",
    effectiveFrom: "2024-03-01",
    effectiveTo: null,
    isActive: true,
    priority: 1,
  },
];

const mockBonusCalculations = [
  {
    id: 1,
    paymentId: 4,
    solicitorId: 1,
    bonusRuleId: 1,
    paymentAmount: "454.17",
    bonusPercentage: "5.00",
    bonusAmount: "22.71",
    calculatedAt: "2024-12-01T10:30:00Z",
    isPaid: true,
    paidAt: "2024-12-15T14:20:00Z",
    notes: "Standard donation bonus",
  },
  {
    id: 2,
    paymentId: 42,
    solicitorId: 1,
    bonusRuleId: 2,
    paymentAmount: "7500.00",
    bonusPercentage: "7.50",
    bonusAmount: "562.50",
    calculatedAt: "2025-06-16T09:15:00Z",
    isPaid: false,
    paidAt: null,
    notes: "Major donor bonus - pending payment",
  },
];

// Using your original payment data structure
const paymentsData = [
  {
    id: 4,
    amount: "416.67",
    amountUsd: "454.17",
    currency: "EUR",
    paymentDate: "2024-12-01",
    receivedDate: "2024-12-01",
    paymentMethod: "credit_card",
    paymentStatus: "completed",
    referenceNumber: "CC-2024-12-001",
    contactFirstName: "David",
    contactLastName: "Cohen",
    contactEmail: "david.cohen@email.com",
    pledgeDescription: "Alef 2004/05",
    categoryName: "Donation",
    // Updated with actual solicitor data
    solicitorId: 1,
    bonusPercentage: "5.00",
    bonusAmount: "22.71",
    bonusRuleId: 1,
  },
  {
    id: 42,
    amount: "7500.00",
    amountUsd: "7500.00",
    currency: "USD",
    paymentDate: "2025-06-16",
    receivedDate: "2025-06-16",
    paymentMethod: "cash",
    paymentStatus: "completed",
    referenceNumber: "jtfy789",
    contactFirstName: "Aaron",
    contactLastName: "Friedman",
    contactEmail: "aaron.friedman@email.com",
    pledgeDescription: "Alef 2019/20",
    categoryName: "Donation",
    // Major donor with higher bonus
    solicitorId: 1,
    bonusPercentage: "7.50",
    bonusAmount: "562.50",
    bonusRuleId: 2,
  },
  // Some unassigned payments
  {
    id: 30,
    amount: "200.00",
    amountUsd: "132.00",
    currency: "AUD",
    paymentDate: "2024-12-15",
    receivedDate: null,
    paymentMethod: "credit_card",
    paymentStatus: "processing",
    referenceNumber: "CC-2024-12-PROC",
    contactFirstName: "Leah",
    contactLastName: "Goldman",
    contactEmail: "leah.goldman@email.com",
    pledgeDescription: "Banquet 2019 - General Sponsorship",
    categoryName: "Donation",
    solicitorId: null,
    bonusPercentage: null,
    bonusAmount: null,
    bonusRuleId: null,
  },
];

export default function SolicitorDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("solicitors");

  const filteredSolicitors = useMemo(() => {
    return mockSolicitors.filter((solicitor) => {
      const matchesSearch =
        solicitor.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        solicitor.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        solicitor.solicitorCode
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        solicitor.email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || solicitor.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [searchTerm, statusFilter]);

  const unassignedPayments = useMemo(() => {
    return paymentsData.filter((payment) => !payment.solicitorId);
  }, []);

  const assignedPayments = useMemo(() => {
    return paymentsData.filter((payment) => payment.solicitorId);
  }, []);

  const stats = useMemo(() => {
    const activeSolicitors = mockSolicitors.filter(
      (s) => s.status === "active"
    ).length;
    const totalRaised = mockSolicitors.reduce(
      (sum, s) => sum + s.totalRaised,
      0
    );
    const totalBonuses = mockSolicitors.reduce(
      (sum, s) => sum + s.bonusEarned,
      0
    );
    const unpaidBonuses = mockBonusCalculations
      .filter((calc) => !calc.isPaid)
      .reduce((sum, calc) => sum + Number.parseFloat(calc.bonusAmount), 0);

    return {
      activeSolicitors,
      totalSolicitors: mockSolicitors.length,
      totalRaised,
      totalBonuses,
      unpaidBonuses,
      unassignedCount: unassignedPayments.length,
      assignedCount: assignedPayments.length,
    };
  }, [unassignedPayments.length, assignedPayments.length]);

  const getStatusBadge = (status: string) => {
    const variants = {
      active: "bg-green-100 text-green-800 border-green-200",
      inactive: "bg-gray-100 text-gray-800 border-gray-200",
      suspended: "bg-red-100 text-red-800 border-red-200",
      completed: "bg-green-100 text-green-800 border-green-200",
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      processing: "bg-blue-100 text-blue-800 border-blue-200",
      failed: "bg-red-100 text-red-800 border-red-200",
    };
    return (
      variants[status as keyof typeof variants] ||
      "bg-gray-100 text-gray-800 border-gray-200"
    );
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">
          Solicitor Management System
        </h1>
        <p className="text-gray-600">
          Based on your database schema with full solicitor tracking
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Solicitors
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeSolicitors}</div>
            <p className="text-xs text-muted-foreground">
              of {stats.totalSolicitors} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Raised</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats.totalRaised.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.assignedCount} assigned payments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Bonus Calculations
            </CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats.totalBonuses.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              ${stats.unpaidBonuses.toLocaleString()} unpaid
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unassigned</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats.unassignedCount}
            </div>
            <p className="text-xs text-muted-foreground">
              payments need assignment
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search solicitors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Add Solicitor
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="solicitors">Solicitors</TabsTrigger>
          <TabsTrigger value="bonus-rules">Bonus Rules</TabsTrigger>
          <TabsTrigger value="calculations">Calculations</TabsTrigger>
          <TabsTrigger value="assigned">Assigned Payments</TabsTrigger>
          <TabsTrigger value="unassigned">Unassigned</TabsTrigger>
        </TabsList>

        <TabsContent value="solicitors">
          <Card>
            <CardHeader>
              <CardTitle>
                Solicitor Directory ({filteredSolicitors.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Solicitor</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Commission Rate</TableHead>
                      <TableHead>Total Raised</TableHead>
                      <TableHead>Bonus Earned</TableHead>
                      <TableHead>Hire Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSolicitors.map((solicitor) => (
                      <TableRow key={solicitor.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {solicitor.firstName} {solicitor.lastName}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {solicitor.email}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Contact ID: {solicitor.contactId}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">
                          {solicitor.solicitorCode}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusBadge(solicitor.status)}>
                            {solicitor.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{solicitor.commissionRate}%</TableCell>
                        <TableCell className="font-medium">
                          ${solicitor.totalRaised.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-green-600 font-medium">
                          ${solicitor.bonusEarned.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {new Date(solicitor.hireDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              View
                            </Button>
                            <Button variant="outline" size="sm">
                              Edit
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bonus-rules">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Bonus Rules ({mockBonusRules.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rule Name</TableHead>
                      <TableHead>Solicitor</TableHead>
                      <TableHead>Bonus %</TableHead>
                      <TableHead>Payment Type</TableHead>
                      <TableHead>Min Amount</TableHead>
                      <TableHead>Max Amount</TableHead>
                      <TableHead>Effective Period</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockBonusRules.map((rule) => {
                      const solicitor = mockSolicitors.find(
                        (s) => s.id === rule.solicitorId
                      );
                      return (
                        <TableRow key={rule.id}>
                          <TableCell className="font-medium">
                            {rule.ruleName}
                          </TableCell>
                          <TableCell>
                            {solicitor
                              ? `${solicitor.firstName} ${solicitor.lastName}`
                              : "Unknown"}
                          </TableCell>
                          <TableCell>{rule.bonusPercentage}%</TableCell>
                          <TableCell>
                            <Badge variant="outline">{rule.paymentType}</Badge>
                          </TableCell>
                          <TableCell>
                            $
                            {Number.parseFloat(rule.minAmount).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {rule.maxAmount
                              ? `$${Number.parseFloat(
                                  rule.maxAmount
                                ).toLocaleString()}`
                              : "No limit"}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>
                                From:{" "}
                                {new Date(
                                  rule.effectiveFrom
                                ).toLocaleDateString()}
                              </div>
                              <div>
                                To:{" "}
                                {rule.effectiveTo
                                  ? new Date(
                                      rule.effectiveTo
                                    ).toLocaleDateString()
                                  : "Ongoing"}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{rule.priority}</TableCell>
                          <TableCell>
                            <Badge
                              className={
                                rule.isActive
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                              }
                            >
                              {rule.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calculations">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Bonus Calculations ({mockBonusCalculations.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment ID</TableHead>
                      <TableHead>Solicitor</TableHead>
                      <TableHead>Payment Amount</TableHead>
                      <TableHead>Bonus %</TableHead>
                      <TableHead>Bonus Amount</TableHead>
                      <TableHead>Calculated</TableHead>
                      <TableHead>Payment Status</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockBonusCalculations.map((calc) => {
                      const solicitor = mockSolicitors.find(
                        (s) => s.id === calc.solicitorId
                      );
                      return (
                        <TableRow key={calc.id}>
                          <TableCell className="font-mono">
                            #{calc.paymentId}
                          </TableCell>
                          <TableCell>
                            {solicitor
                              ? `${solicitor.firstName} ${solicitor.lastName}`
                              : "Unknown"}
                          </TableCell>
                          <TableCell>
                            $
                            {Number.parseFloat(
                              calc.paymentAmount
                            ).toLocaleString()}
                          </TableCell>
                          <TableCell>{calc.bonusPercentage}%</TableCell>
                          <TableCell className="font-medium text-green-600">
                            $
                            {Number.parseFloat(
                              calc.bonusAmount
                            ).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {new Date(calc.calculatedAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                calc.isPaid
                                  ? "bg-green-100 text-green-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }
                            >
                              {calc.isPaid ? "Paid" : "Pending"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {calc.notes}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assigned">
          <Card>
            <CardHeader>
              <CardTitle>
                Payments with Solicitor Assignment ({assignedPayments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Solicitor</TableHead>
                      <TableHead>Bonus %</TableHead>
                      <TableHead>Bonus Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignedPayments.map((payment) => {
                      const solicitor = mockSolicitors.find(
                        (s) => s.id === payment.solicitorId
                      );
                      return (
                        <TableRow key={payment.id}>
                          <TableCell className="font-medium">
                            #{payment.id}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {payment.contactFirstName}{" "}
                                {payment.contactLastName}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {payment.contactEmail}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                $
                                {Number.parseFloat(
                                  payment.amountUsd
                                ).toLocaleString()}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {payment.currency}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {solicitor ? (
                              <div>
                                <div className="font-medium">
                                  {solicitor.firstName} {solicitor.lastName}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {solicitor.solicitorCode}
                                </div>
                              </div>
                            ) : (
                              "Unknown"
                            )}
                          </TableCell>
                          <TableCell>{payment.bonusPercentage}%</TableCell>
                          <TableCell className="text-green-600 font-medium">
                            $
                            {Number.parseFloat(
                              payment.bonusAmount || "0"
                            ).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {new Date(payment.paymentDate).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={getStatusBadge(payment.paymentStatus)}
                            >
                              {payment.paymentStatus}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="unassigned">
          <Card>
            <CardHeader>
              <CardTitle>
                Unassigned Payments ({unassignedPayments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {unassignedPayments.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {unassignedPayments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-medium">
                            #{payment.id}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {payment.contactFirstName}{" "}
                                {payment.contactLastName}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {payment.contactEmail}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                $
                                {Number.parseFloat(
                                  payment.amountUsd
                                ).toLocaleString()}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {payment.currency}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {new Date(payment.paymentDate).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {payment.categoryName}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={getStatusBadge(payment.paymentStatus)}
                            >
                              {payment.paymentStatus}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm">
                              Assign Solicitor
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium">
                    All payments have solicitor assignments!
                  </h3>
                  <p className="text-muted-foreground">
                    Great job managing your solicitor assignments.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
