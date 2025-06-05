"use client";

import { useContactQuery } from "@/lib/query/useContactDetails";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Phone,
  Mail,
  MessageCircle,
  DollarSign,
  User,
  Calendar,
  School,
  MapPin,
  Briefcase,
  AlertCircle,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function ContactDetailsPage() {
  const contactId = 2;
  const { data, isLoading, isError, error } = useContactQuery({
    contactId,
    page: 1,
    limit: 10,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="space-y-4 max-w-md w-full">
          <Skeleton className="h-12 w-full" />
          <div className="flex gap-4">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="max-w-md w-full">
          <CardHeader className="items-center">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <CardTitle>Error Loading Contact</CardTitle>
          </CardHeader>
          <CardContent className="text-center text-destructive">
            {error.message}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data?.contact || !data?.financialSummary) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="max-w-md w-full">
          <CardHeader className="items-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground" />
            <CardTitle>No Data Available</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            Contact information could not be found
          </CardContent>
        </Card>
      </div>
    );
  }

  const { contact, financialSummary } = data;
  const paymentPercentage =
    financialSummary.totalPledgedUsd > 0
      ? Math.round(
          (financialSummary.totalPaidUsd / financialSummary.totalPledgedUsd) *
            100
        )
      : 0;

  return (
    <div className="min-h-screen">
      {/* Header Section */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="container max-w-7xl mx-auto py-6">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <Avatar className="h-20 w-20 border">
              <AvatarImage
                src={`https://api.dicebear.com/7.x/initials/svg?seed=${contact.firstName} ${contact.lastName}`}
                alt={`${contact.firstName} ${contact.lastName}`}
              />
              <AvatarFallback className="text-xl">
                {contact.firstName[0]}
                {contact.lastName[0]}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                <h1 className="text-3xl font-bold">
                  {contact.title ? `${contact.title}. ` : ""}
                  {contact.firstName} {contact.lastName}
                </h1>

                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Active</Badge>
                  {contact.contactRoles.some(
                    (role) => role.roleName === "Donor"
                  ) && <Badge>Donor</Badge>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                <div className="flex items-center gap-2">
                  <div className="bg-muted p-2 rounded-full">
                    <Mail className="h-4 w-4" />
                  </div>
                  <span className="text-sm">{contact.email ?? "N/A"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="bg-muted p-2 rounded-full">
                    <Phone className="h-4 w-4" />
                  </div>
                  <span className="text-sm">{contact.phone ?? "N/A"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="bg-muted p-2 rounded-full">
                    <MessageCircle className="h-4 w-4" />
                  </div>
                  <span className="text-sm">
                    WhatsApp: {contact.phone ?? "N/A"}
                  </span>
                </div>
              </div>
            </div>

            <div className="hidden md:flex flex-col items-end gap-2">
              <div className="text-sm text-muted-foreground">
                Financial Status
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold">
                  ${financialSummary.currentBalanceUsd}
                </span>
                <span className="text-sm text-muted-foreground">balance</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container max-w-7xl mx-auto py-8 px-4">
        <Tabs defaultValue="overview">
          <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
            <TabsTrigger
              value="overview"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="roles"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
            >
              Roles
            </TabsTrigger>
            <TabsTrigger
              value="student"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
            >
              Student Info
            </TabsTrigger>
            <TabsTrigger
              value="financial"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
            >
              Financial
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-4 divide-y">
                    <div className="grid grid-cols-2 gap-1 py-2">
                      <dt className="text-muted-foreground font-medium">
                        Full Name
                      </dt>
                      <dd className="text-right">
                        {contact.title ? `${contact.title}. ` : ""}
                        {contact.firstName} {contact.lastName}
                      </dd>
                    </div>
                    <div className="grid grid-cols-2 gap-1 py-2">
                      <dt className="text-muted-foreground font-medium">
                        Email
                      </dt>
                      <dd className="text-right overflow-hidden text-ellipsis">
                        {contact.email ?? "N/A"}
                      </dd>
                    </div>
                    <div className="grid grid-cols-2 gap-1 py-2">
                      <dt className="text-muted-foreground font-medium">
                        Phone
                      </dt>
                      <dd className="text-right">{contact.phone ?? "N/A"}</dd>
                    </div>
                    <div className="grid grid-cols-2 gap-1 py-2">
                      <dt className="text-muted-foreground font-medium">
                        Gender
                      </dt>
                      <dd className="text-right capitalize">
                        {contact.gender ?? "N/A"}
                      </dd>
                    </div>
                    <div className="grid grid-cols-2 gap-1 py-2">
                      <dt className="text-muted-foreground font-medium flex items-center">
                        <MapPin className="h-4 w-4 mr-1" />
                        Address
                      </dt>
                      <dd className="text-right">{contact.address ?? "N/A"}</dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Financial Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-muted-foreground">
                        Payment Progress
                      </span>
                      <span className="text-sm font-medium">
                        {paymentPercentage}%
                      </span>
                    </div>
                    <Progress value={paymentPercentage} />
                  </div>

                  <dl className="space-y-4 divide-y">
                    <div className="grid grid-cols-2 gap-1 py-2">
                      <dt className="text-muted-foreground font-medium">
                        Total Pledged
                      </dt>
                      <dd className="text-right font-medium">
                        ${financialSummary.totalPledgedUsd}
                      </dd>
                    </div>
                    <div className="grid grid-cols-2 gap-1 py-2">
                      <dt className="text-muted-foreground font-medium">
                        Total Paid
                      </dt>
                      <dd className="text-right font-medium">
                        ${financialSummary.totalPaidUsd}
                      </dd>
                    </div>
                    <div className="grid grid-cols-2 gap-1 py-2">
                      <dt className="text-muted-foreground font-medium">
                        Current Balance
                      </dt>
                      <dd className="text-right font-bold">
                        ${financialSummary.currentBalanceUsd}
                      </dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    Active Roles
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {contact.contactRoles.length > 0 ? (
                      contact.contactRoles.map((role) => (
                        <Badge
                          key={role.id}
                          variant={role.isActive ? "default" : "outline"}
                        >
                          {role.roleName}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-muted-foreground">No roles assigned</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Roles Tab */}
          <TabsContent value="roles" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Contact Roles
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {contact.contactRoles.length > 0 ? (
                    contact.contactRoles.map((role) => (
                      <div
                        key={role.id}
                        className={`border rounded-lg p-5 ${
                          role.isActive
                            ? "border-l-4 border-l-primary"
                            : "border-l-4 border-l-muted"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-medium text-lg">
                            {role.roleName}
                          </h3>
                          <Badge
                            variant={role.isActive ? "default" : "outline"}
                          >
                            {role.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2 bg-muted/30 p-2 rounded">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>
                              Start:{" "}
                              <span className="font-medium">
                                {role.startDate ?? "N/A"}
                              </span>
                            </span>
                          </div>
                          {role.endDate && (
                            <div className="flex items-center gap-2 bg-muted/30 p-2 rounded">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span>
                                End:{" "}
                                <span className="font-medium">
                                  {role.endDate}
                                </span>
                              </span>
                            </div>
                          )}
                        </div>
                        {role.notes && (
                          <div className="mt-3 text-sm text-muted-foreground bg-muted/20 p-3 rounded border-l-2 border-l-primary">
                            {role.notes}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 text-center py-8">
                      <p className="text-muted-foreground">
                        No contact roles assigned
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Student Tab */}
          <TabsContent value="student" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <School className="h-5 w-5" />
                  Student Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-6">
                  {contact.studentRoles.length > 0 ? (
                    contact.studentRoles.map((role) => (
                      <div
                        key={role.id}
                        className={`border rounded-lg ${
                          role.isActive
                            ? "border-l-4 border-l-primary"
                            : "border-l-4 border-l-muted"
                        }`}
                      >
                        <div className="bg-muted/20 p-4 border-b">
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                            <h3 className="font-medium text-lg flex items-center gap-2">
                              <School className="h-5 w-5" />
                              {role.program} - {role.track}
                            </h3>
                            <Badge
                              variant={role.isActive ? "default" : "outline"}
                            >
                              {role.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </div>

                        <div className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div className="bg-muted/20 p-3 rounded-lg">
                              <div className="text-xs text-muted-foreground mb-1">
                                Academic Year
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span className="font-medium">
                                  {role.year ?? "N/A"}
                                </span>
                              </div>
                            </div>
                            <div className="bg-muted/20 p-3 rounded-lg">
                              <div className="text-xs text-muted-foreground mb-1">
                                Machzor
                              </div>
                              <div className="flex items-center gap-2">
                                <School className="h-4 w-4" />
                                <span className="font-medium">
                                  {role.machzor ?? "N/A"}
                                </span>
                              </div>
                            </div>
                            <div className="bg-muted/20 p-3 rounded-lg">
                              <div className="text-xs text-muted-foreground mb-1">
                                Status
                              </div>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                <span className="font-medium">
                                  {role.status ?? "N/A"}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="flex items-center gap-2 p-2 border-l-2 border-l-primary">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span>
                                Start Date:{" "}
                                <span className="font-medium">
                                  {role.startDate ?? "N/A"}
                                </span>
                              </span>
                            </div>
                            <div className="flex items-center gap-2 p-2 border-l-2 border-l-muted">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span>
                                End Date:{" "}
                                <span className="font-medium">
                                  {role.endDate ?? "N/A"}
                                </span>
                              </span>
                            </div>
                          </div>

                          {role.additionalNotes && (
                            <div className="mt-2 text-sm bg-muted/20 p-3 rounded border-l-2 border-l-primary">
                              <div className="font-medium mb-1">
                                Additional Notes:
                              </div>
                              <p className="text-muted-foreground">
                                {role.additionalNotes}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <School className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">
                        No student roles assigned
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Financial Tab */}
          <TabsContent value="financial" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Financial Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-6 text-center">
                        <p className="text-sm text-muted-foreground mb-1">
                          Total Pledged
                        </p>
                        <p className="text-3xl font-bold">
                          ${financialSummary.totalPledgedUsd}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-6 text-center">
                        <p className="text-sm text-muted-foreground mb-1">
                          Total Paid
                        </p>
                        <p className="text-3xl font-bold">
                          ${financialSummary.totalPaidUsd}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-6 text-center">
                        <p className="text-sm text-muted-foreground mb-1">
                          Current Balance
                        </p>
                        <p className="text-3xl font-bold">
                          ${financialSummary.currentBalanceUsd}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardContent className="p-6">
                      <h3 className="font-medium text-lg mb-4 flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        Payment Progress
                      </h3>

                      <div className="space-y-4">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">Progress</span>
                          <span className="font-medium">
                            {paymentPercentage}% Complete
                          </span>
                        </div>

                        <div className="w-full bg-muted rounded-full h-4 overflow-hidden">
                          <div
                            className="h-4 rounded-full bg-primary"
                            style={{ width: `${paymentPercentage}%` }}
                          ></div>
                        </div>

                        <div className="flex justify-between items-center mt-2 text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-primary"></div>
                            <span>Paid: ${financialSummary.totalPaidUsd}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-muted-foreground"></div>
                            <span>
                              Remaining: ${financialSummary.currentBalanceUsd}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-border"></div>
                            <span>
                              Total: ${financialSummary.totalPledgedUsd}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
