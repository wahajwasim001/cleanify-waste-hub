import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, TrendingUp, Users, Recycle, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const AdminAnalytics = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [wasteCollectionTrend, setWasteCollectionTrend] = useState<any[]>([]);
  const [recyclingTrend, setRecyclingTrend] = useState<any[]>([]);
  const [requestStatusData, setRequestStatusData] = useState<any[]>([]);
  const [teamPerformance, setTeamPerformance] = useState<any[]>([]);
  const [monthlyDonations, setMonthlyDonations] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalRequests: 0,
    totalRecycled: 0,
    totalDonations: 0,
    avgResponseTime: 0,
  });

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/login");
      return;
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("*")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      toast.error("Access denied");
      navigate("/dashboard");
      return;
    }

    await fetchAnalytics();
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Fetch all data
      const [usersRes, wasteRes, recyclingRes, donationsRes] = await Promise.all([
        supabase.from("profiles").select("*"),
        supabase.from("waste_requests").select("*").order("created_at"),
        supabase.from("recycling_transactions").select("*").order("created_at"),
        supabase.from("donations").select("*").order("created_at"),
      ]);

      // Calculate stats
      const totalRecycled = recyclingRes.data?.reduce((sum, r) => sum + (r.total_items || 0), 0) || 0;
      const totalDonations = donationsRes.data?.reduce((sum, d) => sum + Number(d.amount_pkr || 0), 0) || 0;

      setStats({
        totalUsers: usersRes.data?.length || 0,
        totalRequests: wasteRes.data?.length || 0,
        totalRecycled,
        totalDonations,
        avgResponseTime: 0,
      });

      // Process waste collection trend (by week)
      const wasteTrend = processWeeklyTrend(wasteRes.data || [], "created_at");
      setWasteCollectionTrend(wasteTrend);

      // Process recycling trend (by week)
      const recyclingWeekly = processWeeklyRecyclingTrend(recyclingRes.data || []);
      setRecyclingTrend(recyclingWeekly);

      // Process request status breakdown
      const statusBreakdown = processRequestStatus(wasteRes.data || []);
      setRequestStatusData(statusBreakdown);

      // Process team performance
      const teamStats = await processTeamPerformance(wasteRes.data || []);
      setTeamPerformance(teamStats);

      // Process monthly donations
      const donationTrend = processMonthlyDonations(donationsRes.data || []);
      setMonthlyDonations(donationTrend);

    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast.error("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  const processWeeklyTrend = (data: any[], dateField: string) => {
    const weeklyData: { [key: string]: number } = {};
    data.forEach((item) => {
      const date = new Date(item[dateField]);
      const weekKey = `${date.getFullYear()}-W${Math.ceil((date.getDate()) / 7)}`;
      weeklyData[weekKey] = (weeklyData[weekKey] || 0) + 1;
    });

    return Object.entries(weeklyData)
      .sort()
      .slice(-8)
      .map(([week, count]) => ({ week, count }));
  };

  const processWeeklyRecyclingTrend = (data: any[]) => {
    const weeklyData: { [key: string]: { bottles: number; cans: number } } = {};
    data.forEach((item) => {
      const date = new Date(item.created_at);
      const weekKey = `${date.getFullYear()}-W${Math.ceil((date.getDate()) / 7)}`;
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = { bottles: 0, cans: 0 };
      }
      weeklyData[weekKey].bottles += item.bottles || 0;
      weeklyData[weekKey].cans += item.cans || 0;
    });

    return Object.entries(weeklyData)
      .sort()
      .slice(-8)
      .map(([week, data]) => ({ week, ...data }));
  };

  const processRequestStatus = (data: any[]) => {
    const statusCounts: { [key: string]: number } = {};
    data.forEach((item) => {
      statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
    });

    return Object.entries(statusCounts).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
    }));
  };

  const processTeamPerformance = async (wasteRequests: any[]) => {
    const completedRequests = wasteRequests.filter((r) => r.status === "completed");
    const teamStats: { [key: string]: { name: string; completed: number } } = {};

    for (const request of completedRequests) {
      if (request.assigned_team_id) {
        if (!teamStats[request.assigned_team_id]) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", request.assigned_team_id)
            .single();
          teamStats[request.assigned_team_id] = {
            name: profile?.full_name || "Unknown",
            completed: 0,
          };
        }
        teamStats[request.assigned_team_id].completed++;
      }
    }

    return Object.values(teamStats)
      .sort((a, b) => b.completed - a.completed)
      .slice(0, 10);
  };

  const processMonthlyDonations = (data: any[]) => {
    const monthlyData: { [key: string]: number } = {};
    data.forEach((item) => {
      const date = new Date(item.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + Number(item.amount_pkr || 0);
    });

    return Object.entries(monthlyData)
      .sort()
      .slice(-6)
      .map(([month, amount]) => ({ month, amount }));
  };

  const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))", "hsl(var(--muted))"];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center">
        <p className="text-foreground">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate("/admin")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Admin Panel
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Analytics Dashboard</h1>
              <p className="text-muted-foreground">Comprehensive insights and trends</p>
            </div>
          </div>
          <Badge className="bg-primary text-primary-foreground">Admin</Badge>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Waste Requests</CardTitle>
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRequests}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Items Recycled</CardTitle>
              <Recycle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRecycled}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Donations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">PKR {stats.totalDonations}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Growth</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">+12.5%</div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Waste Collection Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Waste Collection Trend</CardTitle>
              <CardDescription>Weekly waste collection requests</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={wasteCollectionTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} name="Requests" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Recycling Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Recycling Trend</CardTitle>
              <CardDescription>Weekly bottles and cans recycled</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={recyclingTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Legend />
                  <Bar dataKey="bottles" fill="hsl(var(--primary))" name="Bottles" />
                  <Bar dataKey="cans" fill="hsl(var(--secondary))" name="Cans" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Request Status Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Request Status</CardTitle>
              <CardDescription>Distribution of waste request statuses</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={requestStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => entry.name}
                    outerRadius={100}
                    fill="hsl(var(--primary))"
                    dataKey="value"
                  >
                    {requestStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Team Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Team Performance</CardTitle>
              <CardDescription>Top performing teams by completed tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={teamPerformance} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                  <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" width={100} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Bar dataKey="completed" fill="hsl(var(--accent))" name="Completed Tasks" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Monthly Donations */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Monthly Donations</CardTitle>
              <CardDescription>Donation trends over the last 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyDonations}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="amount" stroke="hsl(var(--secondary))" strokeWidth={2} name="Amount (PKR)" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;
