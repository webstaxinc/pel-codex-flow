import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Eye, Edit, FileText, Building2 } from 'lucide-react';
import { Request, getRequestsByUser } from '@/lib/storage';
import { PlantCodeForm } from '@/components/forms/PlantCodeForm';
import { CompanyCodeForm } from '@/components/forms/CompanyCodeForm';
import { RequestDetailsDialog } from '@/components/dialogs/RequestDetailsDialog';
import { useToast } from '@/hooks/use-toast';

interface RequestorDashboardProps {
  userEmail: string;
}

export function RequestorDashboard({ userEmail }: RequestorDashboardProps) {
  const [requests, setRequests] = useState<Request[]>([]);
  const [showPlantForm, setShowPlantForm] = useState(false);
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadRequests();
  }, [userEmail]);

  const loadRequests = async () => {
    try {
      const userRequests = await getRequestsByUser(userEmail);
      setRequests(userRequests);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load requests",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'draft': { label: 'Draft', variant: 'secondary' as const },
      'pending-secretary': { label: 'Pending Secretary', variant: 'warning' as const },
      'pending-finance': { label: 'Pending Finance', variant: 'warning' as const },
      'pending-raghu': { label: 'Pending Raghu', variant: 'warning' as const },
      'pending-siva': { label: 'Pending Siva', variant: 'warning' as const },
      'approved': { label: 'Approved', variant: 'success' as const },
      'rejected': { label: 'Rejected', variant: 'destructive' as const },
      'sap-updated': { label: 'SAP Updated', variant: 'success' as const },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, variant: 'secondary' as const };
    return (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    );
  };

  const plantRequests = requests.filter(r => r.type === 'plant');
  const companyRequests = requests.filter(r => r.type === 'company');

  const canEdit = (request: Request) => {
    return request.status !== 'approved' && request.status !== 'rejected' && request.status !== 'sap-updated';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading requests...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">My Requests</h1>
        <p className="text-muted-foreground">Create and track your Plant Code and Company Code requests</p>
      </div>

      {/* Plant Code Requests Section */}
      <Card className="bg-gradient-card shadow-soft">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Building2 className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Plant Code Requests</CardTitle>
                <CardDescription>Manage your plant code creation requests</CardDescription>
              </div>
            </div>
            <Button onClick={() => setShowPlantForm(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create New
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {plantRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No plant code requests yet</p>
              <p className="text-sm">Create your first request to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {plantRequests.map((request) => (
                <div key={request.requestId} className="flex items-center justify-between p-4 border rounded-lg bg-background/50">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="font-semibold">{request.title}</h3>
                      {getStatusBadge(request.status)}
                    </div>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                      <span>ID: {request.requestId}</span>
                      <span>Created: {new Date(request.createdAt).toLocaleDateString()}</span>
                      <span>Updated: {new Date(request.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedRequest(request)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    {canEdit(request) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowPlantForm(true);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Company Code Requests Section */}
      <Card className="bg-gradient-card shadow-soft">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Building2 className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Company Code Requests</CardTitle>
                <CardDescription>Manage your company code creation requests</CardDescription>
              </div>
            </div>
            <Button onClick={() => setShowCompanyForm(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create New
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {companyRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No company code requests yet</p>
              <p className="text-sm">Create your first request to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {companyRequests.map((request) => (
                <div key={request.requestId} className="flex items-center justify-between p-4 border rounded-lg bg-background/50">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="font-semibold">{request.title}</h3>
                      {getStatusBadge(request.status)}
                    </div>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                      <span>ID: {request.requestId}</span>
                      <span>Created: {new Date(request.createdAt).toLocaleDateString()}</span>
                      <span>Updated: {new Date(request.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedRequest(request)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    {canEdit(request) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowCompanyForm(true);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      {showPlantForm && (
        <PlantCodeForm
          open={showPlantForm}
          onOpenChange={setShowPlantForm}
          userEmail={userEmail}
          existingRequest={selectedRequest?.type === 'plant' ? selectedRequest : undefined}
          onSuccess={() => {
            loadRequests();
            setShowPlantForm(false);
            setSelectedRequest(null);
          }}
        />
      )}

      {showCompanyForm && (
        <CompanyCodeForm
          open={showCompanyForm}
          onOpenChange={setShowCompanyForm}
          userEmail={userEmail}
          existingRequest={selectedRequest?.type === 'company' ? selectedRequest : undefined}
          onSuccess={() => {
            loadRequests();
            setShowCompanyForm(false);
            setSelectedRequest(null);
          }}
        />
      )}

      {selectedRequest && !showPlantForm && !showCompanyForm && (
        <RequestDetailsDialog
          request={selectedRequest}
          open={!!selectedRequest}
          onOpenChange={(open) => !open && setSelectedRequest(null)}
        />
      )}
    </div>
  );
}