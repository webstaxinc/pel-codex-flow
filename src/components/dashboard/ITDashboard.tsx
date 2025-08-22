import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { getRequestsWithDetails, updateRequestStatus, addApproval } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import { 
  Database, 
  CheckCircle, 
  Clock, 
  FileText, 
  Search, 
  Eye,
  Activity,
  Calendar,
  Filter,
  TrendingUp
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

export function ITDashboard({ userEmail }: { userEmail: string }) {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [sapUpdateNote, setSapUpdateNote] = useState('');
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

  const handleSAPUpdate = async (requestId: string) => {
    if (!sapUpdateNote.trim()) {
      toast({
        title: "Error",
        description: "Please add an update note",
        variant: "destructive"
      });
      return;
    }

    try {
      await addApproval(requestId, userEmail, 'it', 'sap-updated', sapUpdateNote);
      await updateRequestStatus(requestId, 'sap-updated');
      setSapUpdateNote('');
      setSelectedRequest(null);
      await loadRequests();
      
      toast({
        title: "Success",
        description: "SAP update recorded successfully",
        variant: "default"
      });
    } catch (error) {
      console.error('Failed to update SAP status:', error);
      toast({
        title: "Error",
        description: "Failed to update SAP status",
        variant: "destructive"
      });
    }
  };

  const filteredRequests = requests.filter(request => 
    request.details?.companyCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.details?.plantCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.createdBy.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const approvedRequests = filteredRequests.filter(r => r.status === 'approved');
  const updatedRequests = filteredRequests.filter(r => r.status === 'sap-updated');
  const recentActivity = filteredRequests
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'success';
      case 'sap-updated': return 'default';
      case 'pending': return 'warning';
      case 'rejected': return 'destructive';
      default: return 'secondary';
    }
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
          <h1 className="text-3xl font-bold tracking-tight">IT Dashboard</h1>
          <p className="text-muted-foreground">SAP updates and system maintenance</p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending SAP Updates</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedRequests.length}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting SAP implementation
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Updates</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{updatedRequests.length}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 inline mr-1" />
              SAP updated successfully
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
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
            <CardTitle className="text-sm font-medium">Avg. Processing</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.3</div>
            <p className="text-xs text-muted-foreground">
              Days to SAP update
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">Pending SAP Updates</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
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

          {/* Pending Updates Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Pending SAP Updates ({approvedRequests.length})
              </CardTitle>
              <CardDescription>
                Requests approved by all stakeholders, ready for SAP implementation
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
                    <TableHead>Approved Date</TableHead>
                    <TableHead>Expected Time</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {approvedRequests.map((request) => (
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
                      <TableCell>{new Date(request.updatedAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant="warning">
                          {request.type === 'plant' ? '2 days' : '10 days'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl">
                              <DialogHeader>
                                <DialogTitle>Request Details</DialogTitle>
                                <DialogDescription>
                                  {request.type === 'plant' ? 'Plant Code' : 'Company Code'} Request #{request.id.slice(0, 8)}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  {Object.entries(request.details).map(([key, value]) => (
                                    <div key={key}>
                                      <label className="text-sm font-medium">{key}</label>
                                      <p className="text-sm text-muted-foreground">{value as string}</p>
                                    </div>
                                  ))}
                                </div>
                                {request.approvals && request.approvals.length > 0 && (
                                  <div>
                                    <h4 className="font-medium mb-2">Approval History</h4>
                                    <div className="space-y-2">
                                      {request.approvals.map((approval, index) => (
                                        <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                                          <div>
                                            <Badge variant={approval.decision === 'approved' ? 'success' : 'destructive'}>
                                              {approval.decision}
                                            </Badge>
                                            <span className="ml-2 text-sm">{approval.approverEmail}</span>
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
                            </DialogContent>
                          </Dialog>
                          
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" onClick={() => setSelectedRequest(request)}>
                                <Database className="h-4 w-4 mr-2" />
                                Update SAP
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Mark as Updated in SAP</DialogTitle>
                                <DialogDescription>
                                  Record that this request has been implemented in SAP system.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <label className="text-sm font-medium">Update Notes</label>
                                  <Textarea
                                    value={sapUpdateNote}
                                    onChange={(e) => setSapUpdateNote(e.target.value)}
                                    placeholder="Describe what was updated in SAP..."
                                    className="mt-1"
                                  />
                                </div>
                                <div className="flex justify-end space-x-2">
                                  <Button variant="outline" onClick={() => setSelectedRequest(null)}>
                                    Cancel
                                  </Button>
                                  <Button onClick={() => handleSAPUpdate(request.id)}>
                                    Mark as Updated
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Completed SAP Updates ({updatedRequests.length})
              </CardTitle>
              <CardDescription>
                Requests that have been successfully implemented in SAP
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
                    <TableHead>Updated Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {updatedRequests.map((request) => (
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
                      <TableCell>{new Date(request.updatedAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant="success">SAP Updated</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Activity
              </CardTitle>
              <CardDescription>
                Latest updates and changes in the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="bg-primary/10 p-2 rounded-full">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {request.type === 'plant' ? 'Plant Code' : 'Company Code'} Request Updated
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {request.details?.plantCode || request.details?.companyCode} by {request.createdBy}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={getStatusColor(request.status)}>
                        {request.status}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(request.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}