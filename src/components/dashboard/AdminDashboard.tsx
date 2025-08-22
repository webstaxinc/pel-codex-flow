import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { getRequestsWithDetails, getAllUsers } from '@/lib/storage';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle,
  Search,
  Filter,
  Calendar,
  Download,
  BarChart3
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

interface AnalyticsData {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  averageProcessingTime: number;
  requestsByType: { name: string; value: number; color: string }[];
  requestsByStatus: { name: string; value: number; color: string }[];
  monthlyTrends: { month: string; plant: number; company: number; total: number }[];
  userActivity: { user: string; requests: number; approved: number; rejected: number }[];
}

export function AdminDashboard() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [requestsData, usersData] = await Promise.all([
        getRequestsWithDetails(),
        getAllUsers()
      ]);
      setRequests(requestsData);
      setUsers(usersData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = useMemo(() => {
    let filtered = requests.filter(request => {
      const matchesSearch = request.details?.companyCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           request.details?.plantCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           request.createdBy.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
      const matchesType = typeFilter === 'all' || request.type === typeFilter;
      
      let matchesDate = true;
      if (dateRange !== 'all') {
        const requestDate = new Date(request.createdAt);
        const now = new Date();
        const daysAgo = dateRange === 'week' ? 7 : dateRange === 'month' ? 30 : 90;
        const filterDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
        matchesDate = requestDate >= filterDate;
      }
      
      return matchesSearch && matchesStatus && matchesType && matchesDate;
    });

    // Sort
    filtered.sort((a, b) => {
      let aValue = a[sortBy as keyof Request];
      let bValue = b[sortBy as keyof Request];
      
      if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
        aValue = new Date(aValue as string).getTime();
        bValue = new Date(bValue as string).getTime();
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [requests, searchTerm, statusFilter, typeFilter, dateRange, sortBy, sortOrder]);

  const analyticsData: AnalyticsData = useMemo(() => {
    const totalRequests = requests.length;
    const pendingRequests = requests.filter(r => r.status === 'pending').length;
    const approvedRequests = requests.filter(r => r.status === 'approved').length;
    const rejectedRequests = requests.filter(r => r.status === 'rejected').length;

    const requestsByType = [
      { name: 'Plant Code', value: requests.filter(r => r.type === 'plant').length, color: 'hsl(var(--primary))' },
      { name: 'Company Code', value: requests.filter(r => r.type === 'company').length, color: 'hsl(var(--secondary))' }
    ];

    const requestsByStatus = [
      { name: 'Pending', value: pendingRequests, color: 'hsl(var(--warning))' },
      { name: 'Approved', value: approvedRequests, color: 'hsl(var(--success))' },
      { name: 'Rejected', value: rejectedRequests, color: 'hsl(var(--destructive))' }
    ];

    // Monthly trends (last 6 months)
    const monthlyTrends = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      const monthRequests = requests.filter(r => {
        const requestDate = new Date(r.createdAt);
        return requestDate >= monthStart && requestDate <= monthEnd;
      });
      
      monthlyTrends.push({
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        plant: monthRequests.filter(r => r.type === 'plant').length,
        company: monthRequests.filter(r => r.type === 'company').length,
        total: monthRequests.length
      });
    }

    // User activity
    const userActivity = users.map(user => {
      const userRequests = requests.filter(r => r.createdBy === user.email);
      return {
        user: user.email,
        requests: userRequests.length,
        approved: userRequests.filter(r => r.status === 'approved').length,
        rejected: userRequests.filter(r => r.status === 'rejected').length
      };
    }).filter(u => u.requests > 0);

    return {
      totalRequests,
      pendingRequests,
      approvedRequests,
      rejectedRequests,
      averageProcessingTime: 0, // Calculate based on approval times
      requestsByType,
      requestsByStatus,
      monthlyTrends,
      userActivity
    };
  }, [requests, users]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'destructive';
      case 'secretary-review': return 'secondary';
      case 'finance-review': return 'secondary';
      case 'raghu-review': return 'secondary';
      case 'siva-review': return 'secondary';
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
          <h1 className="text-3xl font-bold tracking-tight">Admin Analytics Dashboard</h1>
          <p className="text-muted-foreground">Comprehensive view of all requests and system activity</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.totalRequests}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 inline mr-1" />
              +12% from last month
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.pendingRequests}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting approval
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.approvedRequests}</div>
            <p className="text-xs text-muted-foreground">
              Ready for SAP update
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground">
              System users
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="requests">All Requests</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Requests by Type</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analyticsData.requestsByType}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label
                    >
                      {analyticsData.requestsByType.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Requests by Status</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData.requestsByStatus}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Monthly Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analyticsData.monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="plant" stroke="hsl(var(--primary))" name="Plant Code" />
                  <Line type="monotone" dataKey="company" stroke="hsl(var(--secondary))" name="Company Code" />
                  <Line type="monotone" dataKey="total" stroke="hsl(var(--accent))" name="Total" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-y-0 md:space-x-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by code, email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="plant">Plant Code</SelectItem>
                    <SelectItem value="company">Company Code</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Date Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="week">Last Week</SelectItem>
                    <SelectItem value="month">Last Month</SelectItem>
                    <SelectItem value="quarter">Last Quarter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Requests Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Requests ({filteredRequests.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer" onClick={() => {
                      if (sortBy === 'id') {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortBy('id');
                        setSortOrder('asc');
                      }
                    }}>
                      Request ID
                    </TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Requestor</TableHead>
                    <TableHead className="cursor-pointer" onClick={() => {
                      if (sortBy === 'status') {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortBy('status');
                        setSortOrder('asc');
                      }
                    }}>
                      Status
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => {
                      if (sortBy === 'createdAt') {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortBy('createdAt');
                        setSortOrder('desc');
                      }
                    }}>
                      Created
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((request) => (
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
                          {request.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(request.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>User Activity</CardTitle>
                <CardDescription>Requests created by user</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData.userActivity}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="user" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="requests" fill="hsl(var(--primary))" name="Total Requests" />
                    <Bar dataKey="approved" fill="hsl(var(--success))" name="Approved" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Processing Metrics</CardTitle>
                <CardDescription>Average processing times</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Secretary Review</span>
                    <span className="text-sm font-medium">2.3 days</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Finance Review</span>
                    <span className="text-sm font-medium">1.8 days</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Raghu Review</span>
                    <span className="text-sm font-medium">3.1 days</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Siva Approval</span>
                    <span className="text-sm font-medium">1.2 days</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-sm font-medium">Total Average</span>
                    <span className="text-sm font-bold">8.4 days</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}