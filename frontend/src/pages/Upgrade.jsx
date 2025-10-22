import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';

const Upgrade = () => {
  const { user } = useAuth();

  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      features: [
        '3 AI-generated courses',
        'Basic progress tracking',
        'YouTube video integration',
        'Community support',
      ],
      current: user?.plan === 'free',
      cta: 'Current Plan',
      color: 'gray',
    },
    {
      name: 'Pro',
      price: '$9.99',
      period: 'per month',
      features: [
        'Unlimited AI-generated courses',
        'Advanced analytics',
        'Priority AI generation',
        'Export course content',
        'Priority support',
      ],
      current: user?.plan === 'pro',
      cta: 'Upgrade to Pro',
      color: 'primary',
      popular: true,
    },
    {
      name: 'Enterprise',
      price: '$49.99',
      period: 'per month',
      features: [
        'Everything in Pro',
        'Team collaboration',
        'Custom AI models',
        'White-label options',
        'Dedicated support',
        'SLA guarantee',
      ],
      current: user?.plan === 'enterprise',
      cta: 'Contact Sales',
      color: 'purple',
    },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Upgrade Your Learning</h1>
            <p className="text-xl text-gray-600">
              Choose the plan that best fits your learning journey
            </p>
          </div>

          <div className="card mb-8 bg-primary-50 border-primary-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Current Plan: {user?.plan || 'Free'}</h3>
                <p className="text-sm text-gray-600">
                  You've created {user?.courses_created || 0} of {user?.course_limit || 3} courses
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary-600">
                  {user?.courses_created || 0}/{user?.course_limit || 3}
                </div>
                <p className="text-xs text-gray-600">Courses Used</p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan, index) => (
              <div
                key={index}
                className={`card relative ${
                  plan.popular ? 'ring-2 ring-primary-500 shadow-lg' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-primary-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                    <span className="text-gray-600">/{plan.period}</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start">
                      <svg
                        className={`w-5 h-5 ${
                          plan.color === 'primary'
                            ? 'text-primary-600'
                            : plan.color === 'purple'
                            ? 'text-purple-600'
                            : 'text-gray-600'
                        } mr-2 mt-0.5 flex-shrink-0`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-gray-700 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  disabled={plan.current}
                  className={`w-full py-3 rounded-lg font-medium transition-colors ${
                    plan.current
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                      : plan.color === 'primary'
                      ? 'bg-primary-600 text-white hover:bg-primary-700'
                      : plan.color === 'purple'
                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {plan.current ? 'Current Plan' : plan.cta}
                </button>
              </div>
            ))}
          </div>

          <div className="mt-16">
            <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
            <div className="space-y-4 max-w-3xl mx-auto">
              <div className="card">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Can I upgrade or downgrade at any time?
                </h3>
                <p className="text-gray-600 text-sm">
                  Yes! You can change your plan at any time. Changes will be reflected immediately.
                </p>
              </div>
              <div className="card">
                <h3 className="font-semibold text-gray-900 mb-2">
                  What happens to my courses if I downgrade?
                </h3>
                <p className="text-gray-600 text-sm">
                  Your existing courses will remain accessible. You'll only be limited in creating
                  new courses based on your plan.
                </p>
              </div>
              <div className="card">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Is there a refund policy?
                </h3>
                <p className="text-gray-600 text-sm">
                  Yes, we offer a 30-day money-back guarantee on all paid plans.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Upgrade;




