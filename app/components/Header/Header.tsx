export {};

const navigation = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Nutrition Tracker', href: '/tracker' },
  { name: 'Meal Planner', href: '/meal-planner' },
  { name: 'Analytics', href: '/analytics' },
  { name: 'Goals', href: '/goals' },
  { name: 'Settings', href: '/settings' }
];

export default function Header() {
  return (
    <header className="bg-white shadow">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Nutrition Tracker</h1>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navigation.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium hover:border-gray-300"
                >
                  {item.name}
                </a>
              ))}
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
} 