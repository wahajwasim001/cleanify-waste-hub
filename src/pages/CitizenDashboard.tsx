import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Leaf, Trash2, Recycle, LogOut, TrendingUp, Camera, MapPin, Wallet, Map } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Camera as CapCamera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Geolocation } from "@capacitor/geolocation";
import WasteMap from "@/components/WasteMap";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const CitizenDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [bags, setBags] = useState(1);
  const [bottles, setBottles] = useState(0);
  const [cans, setCans] = useState(0);
  const [loading, setLoading] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [stats, setStats] = useState({
    totalRequests: 0,
    totalRecycled: 0,
    totalRewards: 0,
  });
  const [wasteRequests, setWasteRequests] = useState<any[]>([]);

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

    // Get profile with wallet balance
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    setProfile(profile);
    setWalletBalance(profile?.wallet_balance || 0);

    // Get stats
    const { data: requests } = await supabase
      .from("waste_requests")
      .select("*")
      .eq("citizen_id", user.id);

    console.log("Citizen waste requests:", requests);
    console.log("Current user ID:", user.id);
    setWasteRequests(requests || []);

    const { data: recycling } = await supabase
      .from("recycling_transactions")
      .select("*")
      .eq("citizen_id", user.id);

    const totalRecycled = recycling?.reduce((sum, r) => sum + (r.bottles || 0) + (r.cans || 0), 0) || 0;
    
    // Get total rewards from wallet transactions
    const { data: transactions } = await supabase
      .from("wallet_transactions")
      .select("amount_pkr")
      .eq("user_id", user.id)
      .in("transaction_type", ["waste_reward", "recycling_reward"]);

    const totalRewards = transactions?.reduce((sum, t) => sum + Number(t.amount_pkr), 0) || 0;

    setStats({
      totalRequests: requests?.length || 0,
      totalRecycled,
      totalRewards,
    });
  };

  const capturePhoto = async () => {
    try {
      const image = await CapCamera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
      });

      if (image.base64String) {
        setPhoto(`data:image/${image.format};base64,${image.base64String}`);
        toast.success("Photo captured!");
      }
    } catch (error: any) {
      toast.error("Failed to capture photo");
    }
  };

  const getLocation = async () => {
    try {
      const position = await Geolocation.getCurrentPosition();
      const { latitude, longitude } = position.coords;

      // Reverse geocode to get address
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
      );
      const data = await response.json();

      setLocation({
        lat: latitude,
        lng: longitude,
        address: data.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
      });
      toast.success("Location captured!");
    } catch (error: any) {
      toast.error("Failed to get location");
    }
  };

  const handleRequestPickup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!photo || !location) {
      toast.error("Please add a photo and location before requesting pickup");
      return;
    }

    setLoading(true);

    try {
      // Upload photo to storage
      let photoUrl = null;
      if (photo) {
        const base64Data = photo.split(",")[1];
        const fileName = `${user.id}/${Date.now()}.jpg`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("waste-photos")
          .upload(fileName, decode(base64Data), {
            contentType: "image/jpeg",
          });

        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from("waste-photos")
          .getPublicUrl(fileName);
        
        photoUrl = publicUrl;
      }

      // Reward is now calculated server-side via database trigger (20 PKR per bag)
      const { error } = await supabase.from("waste_requests").insert({
        citizen_id: user.id,
        number_of_bags: bags,
        latitude: location?.lat,
        longitude: location?.lng,
        address: location?.address,
        photo_url: photoUrl,
        status: "pending",
        verification_status: "pending",
      });

      if (error) throw error;

      toast.success("Request submitted! You'll earn 20 PKR after cleanup is verified.");
      setBags(1);
      setPhoto(null);
      setLocation(null);
      checkUser();
    } catch (error: any) {
      toast.error(error.message || "Failed to request pickup");
    } finally {
      setLoading(false);
    }
  };

  // Helper function to decode base64
  const decode = (base64: string) => {
    const binaryString = window.atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const handleRecycle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || (bottles === 0 && cans === 0)) {
      toast.error("Please add at least one item to recycle");
      return;
    }

    // Validate input ranges (matching database constraints)
    if (bottles < 0 || bottles > 1000) {
      toast.error("Bottles must be between 0 and 1000");
      return;
    }

    if (cans < 0 || cans > 1000) {
      toast.error("Cans must be between 0 and 1000");
      return;
    }

    setLoading(true);
    // Reward is now calculated server-side via database trigger (5 PKR per item)

    try {
      const { error } = await supabase.from("recycling_transactions").insert({
        citizen_id: user.id,
        bottles,
        cans,
        total_items: 0, // Will be calculated by trigger
        reward_pkr: 0, // Will be calculated by trigger
      });

      if (error) throw error;

      toast.success("Recycling recorded! Your reward has been automatically added to your wallet.");
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
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Wallet Balance</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{walletBalance} PKR</div>
            </CardContent>
          </Card>
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
              <CardTitle className="text-sm font-medium">Total Rewards</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRewards} PKR</div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Request Pickup */}
          <Card>
            <CardHeader>
              <CardTitle>Request Waste Pickup</CardTitle>
              <CardDescription>Report waste and earn 20 PKR reward!</CardDescription>
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

                {/* Photo Capture */}
                <div className="space-y-2">
                  <Label>Waste Photo</Label>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={capturePhoto}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    {photo ? "Retake Photo" : "Take Photo"}
                  </Button>
                  {photo && (
                    <div className="mt-2 rounded-lg overflow-hidden border">
                      <img src={photo} alt="Waste" className="w-full h-32 object-cover" />
                    </div>
                  )}
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <Label>Pickup Location</Label>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={getLocation}
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    {location ? "Update Location" : "Get Location"}
                  </Button>
                  {location && (
                    <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
                      {location.address}
                    </div>
                  )}
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-green-800">Your Reward:</span>
                    <span className="text-2xl font-bold text-green-600">+20 PKR</span>
                  </div>
                  <p className="text-xs text-green-700 mt-1">
                    Credited after cleanup verification
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90"
                  disabled={loading || !photo || !location}
                >
                  {loading ? "Requesting..." : "Submit Request"}
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

        {/* My Requests Map */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>My Waste Pickup Requests</CardTitle>
            <CardDescription>View all your pickup requests on the map</CardDescription>
          </CardHeader>
          <CardContent>
            <WasteMap 
              locations={wasteRequests.map(req => ({
                id: req.id,
                latitude: req.latitude,
                longitude: req.longitude,
                address: req.address,
                status: req.status,
                number_of_bags: req.number_of_bags
              }))} 
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CitizenDashboard;