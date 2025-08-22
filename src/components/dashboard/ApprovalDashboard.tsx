import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { getRequestsWithDetails, addApproval, updateRequestStatus } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText, 
  Search, 
  Eye,
  MessageSquare,
  Upload,
  Calendar,
  User,
  Filter
} from 'lucide-react';

interface Request {
  id: string;
  type: 'plant' | 'company';
  status: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  details: any;
  approvals: any[];
}

interface ApprovalDashboardProps {
  userEmail: string;
  userRole: string;
}

export function ApprovalDashboard({ userEmail, userRole }: ApprovalDashboardProps) {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [approvalComment, setApprovalComment] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const requestsData = await getRequestsWithDetails();
      setRequests(requestsData);
    } catch (error) {
      console.error('Failed to load requests:', error);
      toast({
        title: "Error",
        description: "Failed to load requests",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getNextStatus = (currentStatus: string, userRole: string, decision: 'approved' | 'rejected') => {
    if (decision === 'rejected') return 'rejected';
    
    const approvalFlow = {
      'pending': 'secretary-review',
      'secretary-review': 'finance-review',
      'finance-review': 'raghu-review',
      'raghu-review': 'siva-review',
      'siva-review': 'approved'
    };

    return approvalFlow[currentStatus as keyof typeof approvalFlow] || currentStatus;
  };

  const canApprove = (request: Request) => {
    const statusRoleMap = {
      'pending': 'secretary',
      'secretary-review': 'finance',
      'finance-review': 'raghu',
      'raghu-review': 'siva'
    };
    
    return statusRoleMap[request.status as keyof typeof statusRoleMap] === userRole;
  };

  const handleApproval = async (requestId: string, decision: 'approved' | 'rejected') => {
    if (!approvalComment.trim()) {
      toast({
        title: "Error",
        description: "Please add a comment for your decision",
        variant: "destructive"
      });
      return;
    }

    setIsApproving(true);
    try {
      const request = requests.find(r => r.id === requestId);
      if (!request) return;

      await addApproval(requestId, userEmail, userRole, decision, approvalComment);
      
      const nextStatus = getNextStatus(request.status, userRole, decision);
      await updateRequestStatus(requestId, nextStatus);
      
      setApprovalComment('');
      setSelectedRequest(null);
      await loadRequests();
      
      toast({
        title: "Success",
        description: `Request ${decision} successfully`,
        variant: "default"
      });
    } catch (error) {
      console.error('Failed to process approval:', error);
      toast({
        title: "Error",
        description: "Failed to process approval",
        variant: "destructive"
      });
    } finally {
      setIsApproving(false);
    }
  };

  const filteredRequests = requests.filter(request => 
    request.details?.companyCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.details?.plantCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.createdBy.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingRequests = filteredRequests.filter(request => canApprove(request));
  const allRequests = filteredRequests;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'secretary-review': return 'secondary';
      case 'finance-review': return 'secondary';
      case 'raghu-review': return 'secondary';
      case 'siva-review': return 'secondary';
      case 'approved': return 'success';
      case 'rejected': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusDisplay = (status: string) => {
    const statusMap = {
      'pending': 'Pending Review',
      'secretary-review': 'Secretary Review',
      'finance-review': 'Finance Review',
      'raghu-review': 'Raghu Review',
      'siva-review': 'Siva Review',
      'approved': 'Approved',
      'rejected': 'Rejected'
    };
    return statusMap[status as keyof typeof statusMap] || status;
  };

  const getRoleDisplay = (role: string) => {
    const roleMap = {
      'secretary': 'Secretary',
      'finance': 'Finance Team',
      'raghu': 'Raghu',
      'siva': 'Siva'
    };
    return roleMap[role as keyof typeof roleMap] || role;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Approval Dashboard</h1>
          <p className="text-muted-foreground">Review and approve code creation requests</p>
        </div>
        <Badge variant="outline" className="w-fit">
          {getRoleDisplay(userRole)}
        </Badge>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending My Review</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingRequests.length}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting your approval
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{requests.length}</div>
            <p className="text-xs text-muted-foreground">
              All requests in system
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {requests.filter(r => {
                const hasMyApproval = r.approvals?.some(a => 
                  a.approverEmail === userEmail && 
                  a.decision === 'approved' &&
                  new Date(a.timestamp).toDateString() === new Date().toDateString()
                );
                return hasMyApproval;
              }).length}
            </div>
            <p className="text-xs text-muted-foreground">
              By you today
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Review Time</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1.5</div>
            <p className="text-xs text-muted-foreground">
              Days average
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            Pending My Review ({pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="all">All Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {/* Search */}
          <Card>
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by code, requestor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </CardContent>
          </Card>

          {/* Pending Requests */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Requests Awaiting Your Approval
              </CardTitle>
              <CardDescription>
                Review and approve/reject these requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingRequests.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium">All caught up!</h3>
                  <p className="text-muted-foreground">No requests pending your approval.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Request ID</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Requestor</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-mono">{request.id.slice(0, 8)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {request.type === 'plant' ? 'Plant Code' : 'Company Code'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono">
                          {request.details?.plantCode || request.details?.companyCode || 'N/A'}
                        </TableCell>
                        <TableCell>{request.createdBy}</TableCell>
                        <TableCell>{new Date(request.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(request.status)}>
                            {getStatusDisplay(request.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" onClick={() => setSelectedRequest(request)}>
                                <Eye className="h-4 w-4 mr-2" />
                                Review
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl">
                              <DialogHeader>
                                <DialogTitle>Review Request</DialogTitle>
                                <DialogDescription>
                                  {request.type === 'plant' ? 'Plant Code' : 'Company Code'} Request #{request.id.slice(0, 8)}
                                </DialogDescription>
                              </DialogHeader>
                              
                              <div className="grid grid-cols-2 gap-6">
                                {/* Request Details */}
                                <div className="space-y-4">
                                  <h4 className="font-medium">Request Details</h4>
                                  <div className="space-y-3">
                                    {Object.entries(request.details).map(([key, value]) => (
                                      <div key={key}>
                                        <Label className="text-sm font-medium capitalize">
                                          {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                                        </Label>
                                        <p className="text-sm text-muted-foreground mt-1">{value as string}</p>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Previous Approvals */}
                                  {request.approvals && request.approvals.length > 0 && (
                                    <div>
                                      <h4 className="font-medium mb-2">Previous Approvals</h4>
                                      <div className="space-y-2">
                                        {request.approvals.map((approval, index) => (
                                          <div key={index} className="flex items-center justify-between p-3 bg-muted rounded">
                                            <div className="flex items-center space-x-3">
                                              <Badge variant={approval.decision === 'approved' ? 'success' : 'destructive'}>
                                                {approval.decision}
                                              </Badge>
                                              <div>
                                                <p className="text-sm font-medium">{approval.approverEmail}</p>
                                                <p className="text-xs text-muted-foreground">{approval.comment}</p>
                                              </div>
                                            </div>
                                            <span className="text-xs text-muted-foreground">
                                              {new Date(approval.timestamp).toLocaleDateString()}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Approval Form */}
                                <div className="space-y-4">
                                  <h4 className="font-medium">Your Decision</h4>
                                  <div className="space-y-4">
                                    <div>
                                      <Label htmlFor="comment">Comment *</Label>
                                      <Textarea
                                        id="comment"
                                        value={approvalComment}
                                        onChange={(e) => setApprovalComment(e.target.value)}
                                        placeholder="Add your comments about this request..."
                                        className="mt-1"
                                        rows={4}
                                      />
                                    </div>
                                    
                                    <div className="flex space-x-2">
                                      <Button
                                        variant="outline"
                                        className="flex-1"
                                        onClick={() => handleApproval(request.id, 'rejected')}
                                        disabled={isApproving}
                                      >
                                        <XCircle className="h-4 w-4 mr-2" />
                                        Reject
                                      </Button>
                                      <Button
                                        className="flex-1"
                                        onClick={() => handleApproval(request.id, 'approved')}
                                        disabled={isApproving}
                                      >
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Approve
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                All Requests ({allRequests.length})
              </CardTitle>
              <CardDescription>
                Complete history of all requests in the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Requestor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>My Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allRequests.map((request) => {
                    const myApproval = request.approvals?.find(a => a.approverEmail === userEmail);
                    return (
                      <TableRow key={request.id}>
                        <TableCell className="font-mono">{request.id.slice(0, 8)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {request.type === 'plant' ? 'Plant Code' : 'Company Code'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono">
                          {request.details?.plantCode || request.details?.companyCode || 'N/A'}
                        </TableCell>
                        <TableCell>{request.createdBy}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(request.status)}>
                            {getStatusDisplay(request.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(request.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {myApproval ? (
                            <Badge variant={myApproval.decision === 'approved' ? 'success' : 'destructive'}>
                              {myApproval.decision}
                            </Badge>
                          ) : canApprove(request) ? (
                            <Badge variant="warning">Pending</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}