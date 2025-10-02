import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Leaf, Trash2, Recycle, LogOut, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CitizenDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [bags, setBags] = useState(1);
  const [bottles, setBottles] = useState(0);
  const [cans, setCans] = useState(0);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalRequests: 0,
    totalRecycled: 0,
    totalEarnings: 0,
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

    setUser(user);

    // Get profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    setProfile(profile);

    // Get stats
    const { data: requests } = await supabase
      .from("waste_requests")
      .select("*")
      .eq("citizen_id", user.id);

    const { data: recycling } = await supabase
      .from("recycling_transactions")
      .select("*")
      .eq("citizen_id", user.id);

    const totalRecycled = recycling?.reduce((sum, r) => sum + (r.bottles || 0) + (r.cans || 0), 0) || 0;
    const totalEarnings = recycling?.reduce((sum, r) => sum + Number(r.reward_pkr), 0) || 0;

    setStats({
      totalRequests: requests?.length || 0,
      totalRecycled,
      totalEarnings,
    });
  };

  const handleRequestPickup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    const cost = bags * 20;

    try {
      const { error } = await supabase.from("waste_requests").insert({
        citizen_id: user.id,
        number_of_bags: bags,
        cost_pkr: cost,
      });

      if (error) throw error;

      toast.success(`Pickup requested! Cost: ${cost} PKR`);
      setBags(1);
      checkUser();
    } catch (error: any) {
      toast.error(error.message || "Failed to request pickup");
    } finally {
      setLoading(false);
    }
  };

  const handleRecycle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || (bottles === 0 && cans === 0)) {
      toast.error("Please add at least one item to recycle");
      return;
    }

    setLoading(true);
    const reward = (bottles + cans) * 5;

    try {
      const { error } = await supabase.from("recycling_transactions").insert({
        citizen_id: user.id,
        bottles,
        cans,
        reward_pkr: reward,
      });

      if (error) throw error;

      toast.success(`Recycling recorded! Reward: ${reward} PKR`);
      setBottles(0);
      setCans(0);
      checkUser();
    } catch (error: any) {
      toast.error(error.message || "Failed to record recycling");
    } finally {
      setLoading(false);
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
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Welcome, {profile.full_name}
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
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Pickups</CardTitle>
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
              <CardTitle className="text-sm font-medium">Rewards Earned</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEarnings} PKR</div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Request Pickup */}
          <Card>
            <CardHeader>
              <CardTitle>Request Waste Pickup</CardTitle>
              <CardDescription>20 PKR per bag</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRequestPickup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bags">Number of Bags</Label>
                  <Input
                    id="bags"
                    type="number"
                    min="1"
                    value={bags}
                    onChange={(e) => setBags(Number(e.target.value))}
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  Total Cost: <span className="font-bold text-foreground">{bags * 20} PKR</span>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90"
                  disabled={loading}
                >
                  {loading ? "Requesting..." : "Request Pickup"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Recycling */}
          <Card>
            <CardHeader>
              <CardTitle>Recycle & Earn</CardTitle>
              <CardDescription>5 PKR per bottle or can</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRecycle} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bottles">Number of Bottles</Label>
                  <Input
                    id="bottles"
                    type="number"
                    min="0"
                    value={bottles}
                    onChange={(e) => setBottles(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cans">Number of Cans</Label>
                  <Input
                    id="cans"
                    type="number"
                    min="0"
                    value={cans}
                    onChange={(e) => setCans(Number(e.target.value))}
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  Reward: <span className="font-bold text-primary">{(bottles + cans) * 5} PKR</span>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-secondary to-accent hover:opacity-90"
                  disabled={loading}
                >
                  {loading ? "Recording..." : "Submit Recycling"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CitizenDashboard;
