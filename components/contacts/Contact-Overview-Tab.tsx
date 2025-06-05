import { Contact, ContactRole, StudentRole } from "@/lib/db/schema";
import { Progress } from "@radix-ui/react-progress";
import {
  User,
  MapPin,
  DollarSign,
  Briefcase,
  School,
  Calendar,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import ContactCategoriesCard from "./Contact-Category";

interface ContactWithRoles extends Contact {
  contactRoles: ContactRole[];
  studentRoles: StudentRole[];
}

interface FinancialSummary {
  totalPledgedUsd: number;
  totalPaidUsd: number;
  currentBalanceUsd: number;
}

interface ContactOverviewTabProps {
  contact: ContactWithRoles;
  financialSummary: FinancialSummary;
}
const ContactOverviewTab: React.FC<ContactOverviewTabProps> = ({
  contact,
  financialSummary,
}) => {
  const paymentPercentage =
    financialSummary.totalPledgedUsd > 0
      ? Math.round(
          (financialSummary.totalPaidUsd / financialSummary.totalPledgedUsd) *
            100
        )
      : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Contact Information Card */}
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
              <dt className="text-muted-foreground font-medium">Full Name</dt>
              <dd className="text-right capitalize">
                {contact.title ? `${contact.title}. ` : ""}
                {contact.firstName} {contact.lastName}
              </dd>
            </div>
            <div className="grid grid-cols-2 gap-1 py-2">
              <dt className="text-muted-foreground font-medium">Email</dt>
              <dd className="text-right overflow-hidden text-ellipsis">
                {contact.email ?? "N/A"}
              </dd>
            </div>
            <div className="grid grid-cols-2 gap-1 py-2">
              <dt className="text-muted-foreground font-medium">Phone</dt>
              <dd className="text-right">{contact.phone ?? "N/A"}</dd>
            </div>
            <div className="grid grid-cols-2 gap-1 py-2">
              <dt className="text-muted-foreground font-medium">Gender</dt>
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

      {/* Quick Financial Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            General Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-sm text-muted-foreground">
                Payment Progress
              </span>
              <span className="text-sm font-medium">{paymentPercentage}%</span>
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
              <dt className="text-muted-foreground font-medium">Total Paid</dt>
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

      <ContactCategoriesCard
        categories={[
          {
            categoryId: 3,
            categoryName: "Tuition",
            categoryDescription: "Educational tuition fees",
            totalPledgedUsd: "36000.00",
            totalPaidUsd: "18000.00",
            currentBalanceUsd: "18000.00",
            pledgeCount: "2",
          },
        ]}
      />

      {/* Roles Section */}
      <Card className="lg:col-span-2">
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
                  className={`border rounded-lg p-4 ${
                    role.isActive
                      ? "border-l-4 border-l-primary"
                      : "border-l-4 border-l-muted"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">{role.roleName}</h3>
                    <Badge variant={role.isActive ? "default" : "outline"}>
                      {role.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {role.startDate && <div>Start: {role.startDate}</div>}
                    {role.endDate && <div>End: {role.endDate}</div>}
                  </div>
                  {role.notes && (
                    <div className="mt-2 text-sm text-muted-foreground bg-muted/20 p-2 rounded">
                      {role.notes}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="col-span-2 text-center py-8">
                <p className="text-muted-foreground">No roles assigned</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Student Information */}
      {contact.studentRoles && contact.studentRoles.length > 0 && (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <School className="h-5 w-5" />
              Student Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4">
              {contact.studentRoles.map((role) => (
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
                      <Badge variant={role.isActive ? "default" : "outline"}>
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
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ContactOverviewTab;
