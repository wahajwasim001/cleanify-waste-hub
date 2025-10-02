import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Leaf, LogOut, Users, Trash2, Recycle, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AdminPanel = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalRequests: 0,
    totalRecycled: 0,
    totalEarnings: 0,
  });
  const [requests, setRequests] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/login");
      return;
    }

    setUser(user);

    // Get profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      toast.error("Access denied");
      navigate("/");
      return;
    }

    setProfile(profile);

    // Get all stats
    const { data: users } = await supabase.from("profiles").select("*");
    const { data: wasteRequests } = await supabase.from("waste_requests").select("*");
    const { data: recycling } = await supabase.from("recycling_transactions").select("*");

    const totalRecycled = recycling?.reduce((sum, r) => sum + (r.bottles || 0) + (r.cans || 0), 0) || 0;

    setStats({
      totalUsers: users?.length || 0,
      totalRequests: wasteRequests?.length || 0,
      totalRecycled,
      totalEarnings: 0, // Calculate from donations if implemented
    });

    // Get pending requests
    const { data: pendingRequests } = await supabase
      .from("waste_requests")
      .select("*, profiles!waste_requests_citizen_id_fkey(full_name)")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    setRequests(pendingRequests || []);

    // Get cleaning teams
    const { data: teamMembers } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "cleaning_team");

    setTeams(teamMembers || []);
  };

  const assignTask = async (requestId: string, teamId: string) => {
    try {
      const { error } = await supabase
        .from("waste_requests")
        .update({
          assigned_team_id: teamId,
          status: "assigned",
        })
        .eq("id", requestId);

      if (error) throw error;

      toast.success("Task assigned successfully!");
      checkUser();
    } catch (error: any) {
      toast.error(error.message || "Failed to assign task");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (!profile) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Leaf className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold text-primary">Cleanify</span>
              <Badge>Admin</Badge>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Admin Dashboard
              </span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Waste Requests</CardTitle>
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRequests}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Items Recycled</CardTitle>
              <Recycle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRecycled}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Platform Impact</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">Growing</div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Requests */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Requests</CardTitle>
            <CardDescription>Assign tasks to cleaning teams</CardDescription>
          </CardHeader>
          <CardContent>
            {requests.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No pending requests</p>
            ) : (
              <div className="space-y-4">
                {requests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/30"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold">{request.profiles.full_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {request.number_of_bags} bags • {request.cost_pkr} PKR
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(request.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {teams.map((team) => (
                        <Button
                          key={team.id}
                          size="sm"
                          variant="outline"
                          onClick={() => assignTask(request.id, team.id)}
                        >
                          Assign to {team.full_name}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminPanel;
