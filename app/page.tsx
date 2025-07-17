import React from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card/Card';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <section className="text-center py-16">
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
            Track Your Nutrition,{' '}
            <span className="text-primary">Achieve Your Goals</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Comprehensive nutrition tracking with smart insights, meal planning, and progress analytics to help you reach your health and fitness goals.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/dashboard">
              <Button size="lg" className="text-lg px-8 py-3">
                Get Started
              </Button>
            </Link>
            <Link href="/food-logger">
              <Button variant="outline" size="lg" className="text-lg px-8 py-3">
                Start Tracking
              </Button>
            </Link>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16">
          <h2 className="text-3xl font-bold text-center mb-12">Key Features</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Food Logging</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Track your daily meals with our comprehensive food database
                </p>
              </CardHeader>
              <CardContent>
                <Link href="/food-logger">
                  <Button variant="outline" className="w-full">
                    Start Logging
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Meal Planning</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Plan your meals ahead with smart recommendations
                </p>
              </CardHeader>
              <CardContent>
                <Link href="/meal-plan">
                  <Button variant="outline" className="w-full">
                    Plan Meals
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Water Tracking</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Stay hydrated with our water intake tracker
                </p>
              </CardHeader>
              <CardContent>
                <Link href="/water-tracker">
                  <Button variant="outline" className="w-full">
                    Track Water
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Progress Analytics</CardTitle>
                <p className="text-sm text-muted-foreground">
                  View detailed analytics and track your progress
                </p>
              </CardHeader>
              <CardContent>
                <Link href="/analytics">
                  <Button variant="outline" className="w-full">
                    View Analytics
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Exercise Tracking</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Log your workouts and track fitness goals
                </p>
              </CardHeader>
              <CardContent>
                <Link href="/exercise/form">
                  <Button variant="outline" className="w-full">
                    Log Exercise
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Dashboard</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Monitor your overall health and fitness performance
                </p>
              </CardHeader>
              <CardContent>
                <Link href="/performance">
                  <Button variant="outline" className="w-full">
                    View Performance
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center py-16 bg-muted/50 rounded-lg">
          <h2 className="text-3xl font-bold mb-4">Ready to Start Your Journey?</h2>
          <p className="text-muted-foreground mb-8">
            Join thousands of users who are already tracking their nutrition and achieving their goals.
          </p>
          <Link href="/dashboard">
            <Button size="lg" className="text-lg px-8 py-3">
              Go to Dashboard
            </Button>
          </Link>
        </section>
      </main>
    </div>
  );
} 