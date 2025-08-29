import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Eye, Edit, FileText, Building2, Search, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Request, getRequestsByUser, getAllRequests, getRequestsWithDetails } from '@/lib/storage';
import { PlantCodeForm } from '@/components/forms/PlantCodeForm';
import { CompanyCodeForm } from '@/components/forms/CompanyCodeForm';
import { RequestDetailsDialog } from '@/components/dialogs/RequestDetailsDialog';
import { useToast } from '@/hooks/use-toast';

interface RequestorDashboardProps {
  userEmail: string;
}

export function RequestorDashboard({ userEmail }: RequestorDashboardProps) {
  const [requests, setRequests] = useState<any[]>([]);
  const [allRequests, setAllRequests] = useState<any[]>([]);
  const [showPlantForm, setShowPlantForm] = useState(false);
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [editingRequest, setEditingRequest] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'my' | 'all'>('my');
  const { toast } = useToast();

  useEffect(() => {
    loadRequests();
  }, [userEmail]);

  const loadRequests = async () => {
    try {
      const userRequests = await getRequestsByUser(userEmail);
      const allRequestsData = await getRequestsWithDetails();
      setRequests(userRequests);
      setAllRequests(allRequestsData);
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
      'pending-siva': { label: 'Pending Siva', variant: 'warning' as const },
      'pending-raghu': { label: 'Pending Raghu', variant: 'warning' as const },
      'pending-manoj': { label: 'Pending Manoj', variant: 'warning' as const },
      'approved': { label: 'Approved', variant: 'success' as const },
      'rejected': { label: 'Rejected', variant: 'destructive' as const },
      'sap-updated': { label: 'SAP Updated', variant: 'success' as const },
      'completed': { label: 'Completed', variant: 'success' as const },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, variant: 'secondary' as const };
    return (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    );
  };

  const displayRequests = view === 'my' ? requests : allRequests;
  const plantRequests = displayRequests.filter(r => r.type === 'plant');
  const companyRequests = displayRequests.filter(r => r.type === 'company');

  const canEdit = (request: any) => {
    // Requestors can edit their own requests that aren't finalized
    if (view === 'my') {
      return request.status !== 'approved' && request.status !== 'rejected' && request.status !== 'sap-updated' && request.status !== 'completed';
    }
    // For viewing all requests, anyone can create a change request
    return request.status === 'approved' || request.status === 'sap-updated' || request.status === 'completed';
  };

  const getEditLabel = (request: any) => {
    if (view === 'my') {
      return request.status === 'draft' ? 'Edit' : 'Edit Draft';
    }
    return 'Change Request';
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {view === 'my' ? 'My Requests' : 'All Requests'}
          </h1>
          <p className="text-muted-foreground">
            {view === 'my' ? 'Create and track your Plant Code and Company Code requests' : 'View all existing codes and create change requests'}
          </p>
        </div>
        <Select value={view} onValueChange={(value) => setView(value as 'my' | 'all')}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="my">My Requests</SelectItem>
            <SelectItem value="all">All Codes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Plant Code Requests Section */}
      <Collapsible defaultOpen={false}>
        <Card className="bg-gradient-card shadow-soft">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CollapsibleTrigger asChild>
                <div className="flex items-center space-x-2 cursor-pointer flex-1">
                  <Building2 className="h-6 w-6 text-primary" />
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <span>{view === 'my' ? 'Plant Code Requests' : 'All Plant Codes'}</span>
                      <ChevronDown className="h-4 w-4" />
                    </CardTitle>
                    <CardDescription>
                      {view === 'my' ? 'Manage your plant code creation requests' : 'View existing plant codes and create change requests'}
                    </CardDescription>
                  </div>
                </div>
              </CollapsibleTrigger>
              {view === 'my' && (
                <Button onClick={() => setShowPlantForm(true)} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Create New
                </Button>
              )}
            </div>
          </CardHeader>
          <CollapsibleContent>
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
                <div key={request.id || request.requestId} className="flex items-center justify-between p-4 border rounded-lg bg-background/50">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="font-semibold">
                        {view === 'my' ? request.title : (request.details?.plantCode || 'Plant Code')}
                      </h3>
                      {getStatusBadge(request.status)}
                      {request.status === 'completed' && (
                        <Badge variant="success">✓ Completed</Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                      <span>ID: {request.id || request.requestId}</span>
                      <span>Created by: {request.createdBy}</span>
                      <span>Created: {new Date(request.createdAt).toLocaleDateString()}</span>
                      <span>Updated: {new Date(request.updatedAt).toLocaleDateString()}</span>
                    </div>
                    {view === 'all' && request.details && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        <span>Name: {request.details.nameOfPlant}</span>
                        {request.details.companyCode && <span className="ml-4">Company: {request.details.companyCode}</span>}
                      </div>
                    )}
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
                          setEditingRequest(request);
                          setShowPlantForm(true);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        {getEditLabel(request)}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Company Code Requests Section */}
      <Collapsible defaultOpen={false}>
        <Card className="bg-gradient-card shadow-soft">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CollapsibleTrigger asChild>
                <div className="flex items-center space-x-2 cursor-pointer flex-1">
                  <Building2 className="h-6 w-6 text-primary" />
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <span>{view === 'my' ? 'Company Code Requests' : 'All Company Codes'}</span>
                      <ChevronDown className="h-4 w-4" />
                    </CardTitle>
                    <CardDescription>
                      {view === 'my' ? 'Manage your company code creation requests' : 'View existing company codes and create change requests'}
                    </CardDescription>
                  </div>
                </div>
              </CollapsibleTrigger>
              {view === 'my' && (
                <Button onClick={() => setShowCompanyForm(true)} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Create New
                </Button>
              )}
            </div>
          </CardHeader>
          <CollapsibleContent>
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
                <div key={request.id || request.requestId} className="flex items-center justify-between p-4 border rounded-lg bg-background/50">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="font-semibold">
                        {view === 'my' ? request.title : (request.details?.companyCode || 'Company Code')}
                      </h3>
                      {getStatusBadge(request.status)}
                      {request.status === 'completed' && (
                        <Badge variant="success">✓ Completed</Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                      <span>ID: {request.id || request.requestId}</span>
                      <span>Created by: {request.createdBy}</span>
                      <span>Created: {new Date(request.createdAt).toLocaleDateString()}</span>
                      <span>Updated: {new Date(request.updatedAt).toLocaleDateString()}</span>
                    </div>
                    {view === 'all' && request.details && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        <span>Name: {request.details.nameOfCompanyCode}</span>
                        {request.details.shareholdingPercentage && <span className="ml-4">Share: {request.details.shareholdingPercentage}%</span>}
                      </div>
                    )}
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
                          setEditingRequest(request);
                          setShowCompanyForm(true);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        {getEditLabel(request)}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Dialogs */}
      {showPlantForm && (
        <PlantCodeForm
          open={showPlantForm}
          onOpenChange={(open) => {
            setShowPlantForm(open);
            if (!open) {
              setEditingRequest(null);
            }
          }}
          userEmail={userEmail}
          existingRequest={editingRequest?.type === 'plant' ? editingRequest : undefined}
          isChangeRequest={view === 'all' && !!editingRequest}
          onSuccess={() => {
            loadRequests();
            setShowPlantForm(false);
            setEditingRequest(null);
          }}
        />
      )}

      {showCompanyForm && (
        <CompanyCodeForm
          open={showCompanyForm}
          onOpenChange={(open) => {
            setShowCompanyForm(open);
            if (!open) {
              setEditingRequest(null);
            }
          }}
          userEmail={userEmail}
          existingRequest={editingRequest?.type === 'company' ? editingRequest : undefined}
          isChangeRequest={view === 'all' && !!editingRequest}
          onSuccess={() => {
            loadRequests();
            setShowCompanyForm(false);
            setEditingRequest(null);
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