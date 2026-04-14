'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function HomePage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-ivory">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-clay">Bokopano</h1>
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              <Link href="#about" className="text-gray-700 hover:text-clay transition-colors">
                About
              </Link>
              <Link href="#opportunities" className="text-gray-700 hover:text-clay transition-colors">
                Opportunities
              </Link>
              <Link href="#contact" className="text-gray-700 hover:text-clay transition-colors">
                Contact
              </Link>
              <div className="flex items-center space-x-4">
                <Link href="/host/apply" className="btn btn-outline">
                  Sign In
                </Link>
                <Link href="/host/apply" className="btn btn-primary">
                  Become a Host
                </Link>
              </div>
            </div>

            <div className="md:hidden flex items-center">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-gray-700 hover:text-clay"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              <Link href="#about" className="block px-3 py-2 text-gray-700 hover:text-clay">
                About
              </Link>
              <Link href="#opportunities" className="block px-3 py-2 text-gray-700 hover:text-clay">
                Opportunities
              </Link>
              <Link href="#contact" className="block px-3 py-2 text-gray-700 hover:text-clay">
                Contact
              </Link>
              <Link href="/host/apply" className="block px-3 py-2 text-clay">
                Become a Host
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-earth mb-6">
              Work. Grow. Belong.
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Discover meaningful volunteer and work-exchange opportunities across Africa. 
              Trade your skills for accommodation, food, and unforgettable experiences.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/opportunities" className="btn btn-primary btn-large">
                Find Opportunities
              </Link>
              <Link href="/host/apply" className="btn btn-secondary btn-large">
                List Your Opportunity
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-earth mb-4">
              About Bokopano
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Connecting passionate individuals with meaningful opportunities across Africa
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-clay rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Connect</h3>
              <p className="text-gray-600">
                Join a community of passionate individuals and hosts creating meaningful connections across Africa.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-leaf rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Exchange Skills</h3>
              <p className="text-gray-600">
                Share your talents and expertise in exchange for accommodation, meals, and unique cultural experiences.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-savanna rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-earth" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Grow Together</h3>
              <p className="text-gray-600">
                Develop new skills, gain valuable experience, and create lasting memories while making a positive impact.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Opportunities */}
      <section id="opportunities" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-earth mb-4">
              Featured Opportunities
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Discover amazing places and projects waiting for your help
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="card overflow-hidden">
              <div className="h-48 bg-savanna"></div>
              <div className="p-6">
                <div className="text-sm text-gray-500 mb-2">Maun, Botswana</div>
                <h3 className="text-xl font-semibold mb-2">Wildlife Conservation Assistant</h3>
                <p className="text-gray-600 mb-4">
                  Help protect endangered species and contribute to important conservation efforts in the Okavango Delta.
                </p>
                <div className="flex gap-4 text-sm text-gray-500 mb-4">
                  <span>4-8 weeks</span>
                  <span>2 volunteers</span>
                </div>
                <Link href="/opportunities/1" className="btn btn-outline w-full">
                  Learn More
                </Link>
              </div>
            </div>
            
            <div className="card overflow-hidden">
              <div className="h-48 bg-leaf"></div>
              <div className="p-6">
                <div className="text-sm text-gray-500 mb-2">Cape Town, South Africa</div>
                <h3 className="text-xl font-semibold mb-2">Community Education Support</h3>
                <p className="text-gray-600 mb-4">
                  Assist in educational programs for underprivileged children and help build a brighter future.
                </p>
                <div className="flex gap-4 text-sm text-gray-500 mb-4">
                  <span>3-6 months</span>
                  <span>5 volunteers</span>
                </div>
                <Link href="/opportunities/2" className="btn btn-outline w-full">
                  Learn More
                </Link>
              </div>
            </div>
            
            <div className="card overflow-hidden">
              <div className="h-48 bg-clay"></div>
              <div className="p-6">
                <div className="text-sm text-gray-500 mb-2">Victoria Falls, Zimbabwe</div>
                <h3 className="text-xl font-semibold mb-2">Eco-Tourism Development</h3>
                <p className="text-gray-600 mb-4">
                  Support sustainable tourism initiatives and help preserve natural wonders while sharing them with the world.
                </p>
                <div className="flex gap-4 text-sm text-gray-500 mb-4">
                  <span>2-4 weeks</span>
                  <span>3 volunteers</span>
                </div>
                <Link href="/opportunities/3" className="btn btn-outline w-full">
                  Learn More
                </Link>
              </div>
            </div>
          </div>
          
          <div className="text-center mt-12">
            <Link href="/opportunities" className="btn btn-primary btn-large">
              View All Opportunities
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-earth text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-2xl font-bold mb-4">Bokopano</h3>
              <p className="text-gray-300">
                Connecting people through meaningful work exchanges across Africa.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Platform</h4>
              <ul className="space-y-2 text-gray-300">
                <li><Link href="#about" className="hover:text-white">About Us</Link></li>
                <li><Link href="#opportunities" className="hover:text-white">Opportunities</Link></li>
                <li><Link href="#contact" className="hover:text-white">Contact</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-300">
                <li><Link href="/faq" className="hover:text-white">FAQ</Link></li>
                <li><Link href="/safety" className="hover:text-white">Safety Guidelines</Link></li>
                <li><Link href="/terms" className="hover:text-white">Terms of Service</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Connect</h4>
              <ul className="space-y-2 text-gray-300">
                <li><Link href="#" className="hover:text-white">Facebook</Link></li>
                <li><Link href="#" className="hover:text-white">Instagram</Link></li>
                <li><Link href="#" className="hover:text-white">Twitter</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Bokopano. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
