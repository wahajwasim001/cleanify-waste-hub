import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Recycle, Leaf, Users, Shield } from "lucide-react";
import { DonationModal } from "@/components/DonationModal";

const Landing = () => {
  const [donationModalOpen, setDonationModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Leaf className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold text-primary">Cleanify</span>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <a href="#about" className="text-foreground hover:text-primary transition-colors">
                About
              </a>
              <a href="#donate" className="text-foreground hover:text-primary transition-colors">
                Donate
              </a>
              <Link to="/login">
                <Button variant="outline">Login</Button>
              </Link>
              <Link to="/signup">
                <Button className="bg-gradient-to-r from-primary to-secondary hover:opacity-90">
                  Create Account
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 md:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-secondary/5 to-transparent" />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center animate-fade-in">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Cleaner Cities, Greener Future
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Join our mission to make waste management efficient, rewarding, and eco-friendly. 
              Request pickups, recycle for rewards, and contribute to a sustainable tomorrow.
            </p>
            <Link to="/signup">
              <Button size="lg" className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-card p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-border">
              <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Recycle className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Smart Recycling</h3>
              <p className="text-muted-foreground">
                Earn rewards for recycling bottles and cans. Track your environmental impact in real-time.
              </p>
            </div>
            <div className="bg-card p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-border">
              <div className="bg-secondary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-secondary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Community Driven</h3>
              <p className="text-muted-foreground">
                Connect with local cleaning teams and contribute to a cleaner neighborhood together.
              </p>
            </div>
            <div className="bg-card p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-border">
              <div className="bg-accent/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Safe & Reliable</h3>
              <p className="text-muted-foreground">
                Transparent pricing, secure payments, and verified cleaning teams you can trust.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl font-bold mb-6 text-foreground">About Cleanify</h2>
            <p className="text-lg text-muted-foreground mb-6">
              Cleanify is a non-profit organization dedicated to revolutionizing waste management 
              in our communities. We believe that everyone deserves access to clean, sustainable 
              waste disposal services.
            </p>
            <p className="text-lg text-muted-foreground">
              Through our platform, we connect citizens with professional cleaning teams, 
              incentivize recycling, and promote environmental consciousness. Every pickup 
              request and recycled item brings us one step closer to cleaner cities.
            </p>
          </div>
        </div>
      </section>

      {/* Donate Section */}
      <section id="donate" className="py-20 bg-gradient-to-r from-primary/5 to-secondary/5">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-4xl font-bold mb-6 text-foreground">Support Our Mission</h2>
            <p className="text-lg text-muted-foreground mb-8">
              Your donations help us expand our services, support cleaning teams, and make 
              waste management accessible to more communities.
            </p>
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-lg px-8 py-6"
              onClick={() => setDonationModalOpen(true)}
            >
              Donate Now
            </Button>
          </div>
        </div>
      </section>

      <DonationModal open={donationModalOpen} onOpenChange={setDonationModalOpen} />

      {/* Footer */}
      <footer className="bg-card border-t border-border py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Leaf className="h-6 w-6 text-primary" />
              <span className="text-lg font-semibold text-foreground">Cleanify</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 Cleanify NPO. All rights reserved.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                Contact
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                Privacy
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                Terms
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
