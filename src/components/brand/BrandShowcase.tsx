import React, { useState } from 'react';
import {
  BrandButton,
  BrandCard,
  BrandCardHeader,
  BrandCardBody,
  BrandCardFooter,
  BrandInput,
  BrandTextarea,
  BrandSelect,
  BrandCheckbox,
  BrandForm,
  BrandFormGroup,
  BrandBadge,
  BrandStatusBadge,
} from './index';

/**
 * Brand System Component Showcase
 * 
 * Demonstrates all available brand components and their usage
 * This is a reference implementation - adapt to your specific needs
 */
export const BrandShowcase: React.FC = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    category: '',
    message: '',
    subscribe: false,
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setFormData((prev) => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.log('Form submitted:', formData);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-darkbg p-8 space-y-12">
      {/* Header Section */}
      <div className="space-y-4">
        <h1 className="text-4xl font-bold font-heading text-text letter-spacing-tight">
          NRETech Brand System
        </h1>
        <p className="text-text-secondary text-lg">
          Premium, unified UI components with gold accents and modern design
        </p>
      </div>

      {/* Buttons Showcase */}
      <BrandCard>
        <BrandCardHeader title="Button Components" subtitle="All button variants with hover effects" />
        <BrandCardBody>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <BrandButton variant="primary">Primary</BrandButton>
            <BrandButton variant="secondary">Secondary</BrandButton>
            <BrandButton variant="outline">Outline</BrandButton>
            <BrandButton variant="success">Success</BrandButton>
            <BrandButton variant="danger">Danger</BrandButton>
            <BrandButton isLoading>Loading...</BrandButton>
            <BrandButton disabled>Disabled</BrandButton>
            <BrandButton variant="ghost">Ghost</BrandButton>
          </div>

          <div className="mt-6 space-y-4">
            <h4 className="font-heading font-bold text-text text-sm">Sizes</h4>
            <div className="flex gap-4 flex-wrap">
              <BrandButton size="sm">Small</BrandButton>
              <BrandButton size="md">Medium</BrandButton>
              <BrandButton size="lg">Large</BrandButton>
            </div>
          </div>

          <div className="mt-6">
            <h4 className="font-heading font-bold text-text text-sm mb-4">Full Width</h4>
            <BrandButton fullWidth>Full Width Button</BrandButton>
          </div>
        </BrandCardBody>
      </BrandCard>

      {/* Form Components */}
      <BrandCard>
        <BrandCardHeader title="Form Components" subtitle="Accessible, brand-aware form inputs" />
        <BrandCardBody>
          <BrandForm onSubmit={handleSubmit}>
            <BrandFormGroup legend="Contact Information">
              <BrandInput
                label="Full Name"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Enter your full name"
                required
              />
              <BrandInput
                label="Email Address"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                helperText="We'll never share your email"
                required
              />
            </BrandFormGroup>

            <BrandFormGroup legend="Details">
              <BrandSelect
                label="Category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                options={[
                  { value: 'general', label: 'General Inquiry' },
                  { value: 'support', label: 'Support' },
                  { value: 'sales', label: 'Sales' },
                  { value: 'other', label: 'Other' },
                ]}
              />

              <BrandTextarea
                label="Message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                placeholder="Your message here..."
                helperText="Maximum 500 characters"
              />
            </BrandFormGroup>

            <BrandCheckbox
              name="subscribe"
              label="Subscribe to our newsletter"
              checked={formData.subscribe}
              onChange={handleChange}
            />

            <div className="flex gap-4 pt-4">
              <BrandButton type="submit" isLoading={loading}>
                {loading ? 'Submitting...' : 'Submit'}
              </BrandButton>
              <BrandButton type="reset" variant="secondary">
                Reset
              </BrandButton>
            </div>
          </BrandForm>
        </BrandCardBody>
      </BrandCard>

      {/* Cards & Layout */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold font-heading text-text">Card Variants</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Default Card */}
          <BrandCard variant="default">
            <BrandCardHeader title="Default Card" subtitle="Standard appearance" />
            <BrandCardBody>
              <p className="text-text-secondary">
                This is a default card with standard appearance and shadow.
              </p>
            </BrandCardBody>
          </BrandCard>

          {/* Elevated Card */}
          <BrandCard variant="elevated">
            <BrandCardHeader title="Elevated Card" subtitle="Premium appearance" />
            <BrandCardBody>
              <p className="text-text-secondary">
                This card has enhanced shadow for more prominence.
              </p>
            </BrandCardBody>
          </BrandCard>

          {/* Interactive Card */}
          <BrandCard variant="interactive">
            <BrandCardHeader title="Interactive Card" subtitle="Hover me" />
            <BrandCardBody>
              <p className="text-text-secondary">
                Hover over this card to see the interactive effects.
              </p>
            </BrandCardBody>
          </BrandCard>
        </div>
      </div>

      {/* Card with Footer */}
      <BrandCard>
        <BrandCardHeader
          title="Complex Card Layout"
          subtitle="With header, body, and footer"
          action={<BrandBadge variant="gold">Premium</BrandBadge>}
        />
        <BrandCardBody>
          <p className="text-text-secondary">
            This card demonstrates the complete layout with all sections. The footer contains action buttons for user interaction.
          </p>
        </BrandCardBody>
        <BrandCardFooter>
          <BrandButton variant="secondary" size="sm">
            Cancel
          </BrandButton>
          <BrandButton variant="primary" size="sm">
            Confirm
          </BrandButton>
        </BrandCardFooter>
      </BrandCard>

      {/* Badges & Status */}
      <BrandCard>
        <BrandCardHeader title="Badges & Status Indicators" />
        <BrandCardBody>
          <div className="space-y-6">
            <div>
              <h4 className="font-heading font-bold text-text mb-3">Status Badges</h4>
              <div className="flex flex-wrap gap-2">
                <BrandStatusBadge status="new" />
                <BrandStatusBadge status="in-progress" />
                <BrandStatusBadge status="submitted" />
                <BrandStatusBadge status="interview" />
                <BrandStatusBadge status="offer" />
                <BrandStatusBadge status="rejected" />
                <BrandStatusBadge status="closed" />
              </div>
            </div>

            <div>
              <h4 className="font-heading font-bold text-text mb-3">Custom Badges</h4>
              <div className="flex flex-wrap gap-2">
                <BrandBadge variant="gold">Featured</BrandBadge>
                <BrandBadge variant="success">Completed</BrandBadge>
                <BrandBadge variant="warning">Pending</BrandBadge>
                <BrandBadge variant="danger">Urgent</BrandBadge>
                <BrandBadge variant="info">Information</BrandBadge>
              </div>
            </div>

            <div>
              <h4 className="font-heading font-bold text-text mb-3">Badge Sizes</h4>
              <div className="flex flex-wrap gap-2">
                <BrandBadge size="sm" variant="gold">
                  Small
                </BrandBadge>
                <BrandBadge size="md" variant="gold">
                  Medium
                </BrandBadge>
              </div>
            </div>
          </div>
        </BrandCardBody>
      </BrandCard>

      {/* Typography */}
      <BrandCard>
        <BrandCardHeader title="Typography System" />
        <BrandCardBody>
          <div className="space-y-4">
            <div>
              <h1 className="text-4xl font-bold font-heading text-text">Heading 1 (4xl)</h1>
              <p className="text-text-secondary text-sm">Using Poppins Bold</p>
            </div>
            <div>
              <h2 className="text-3xl font-bold font-heading text-text">Heading 2 (3xl)</h2>
              <p className="text-text-secondary text-sm">Using Poppins Bold</p>
            </div>
            <div>
              <h3 className="text-2xl font-bold font-heading text-text">Heading 3 (2xl)</h3>
              <p className="text-text-secondary text-sm">Using Poppins Bold</p>
            </div>
            <div>
              <p className="text-base text-text font-body">
                Body text (base) - Using Inter Regular. This is the standard paragraph text used throughout the application.
              </p>
            </div>
            <div>
              <p className="text-sm text-text-secondary font-body">
                Small text (sm) - For secondary information and descriptions.
              </p>
            </div>
          </div>
        </BrandCardBody>
      </BrandCard>

      {/* Color Palette */}
      <BrandCard>
        <BrandCardHeader title="Brand Color Palette" />
        <BrandCardBody>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { name: 'Gold', color: '#EAB308' },
              { name: 'Gold Light', color: '#fef08a' },
              { name: 'Gold Dark', color: '#ca8a04' },
              { name: 'Dark BG', color: '#0D1117' },
              { name: 'Surface', color: '#161B22' },
              { name: 'Surface Light', color: '#1C2128' },
            ].map((item) => (
              <div key={item.color} className="space-y-2">
                <div
                  className="w-full h-16 rounded-lg border border-gold border-opacity-20"
                  style={{ backgroundColor: item.color }}
                />
                <p className="text-xs text-text-secondary font-mono text-center">{item.name}</p>
                <p className="text-xs text-text-secondary font-mono text-center">{item.color}</p>
              </div>
            ))}
          </div>
        </BrandCardBody>
      </BrandCard>

      {/* Spacing & Grid */}
      <BrandCard>
        <BrandCardHeader title="Spacing System" subtitle="Consistent 4px grid" />
        <BrandCardBody>
          <div className="space-y-4">
            {[
              { label: 'xs (4px)', size: 'w-1 h-1' },
              { label: 'sm (8px)', size: 'w-2 h-2' },
              { label: 'md (16px)', size: 'w-4 h-4' },
              { label: 'lg (24px)', size: 'w-6 h-6' },
              { label: 'xl (32px)', size: 'w-8 h-8' },
              { label: '2xl (48px)', size: 'w-12 h-12' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-4">
                <div className={`${item.size} bg-gold rounded`} />
                <span className="text-text-secondary">{item.label}</span>
              </div>
            ))}
          </div>
        </BrandCardBody>
      </BrandCard>

      {/* Footer */}
      <div className="text-center py-8 border-t border-gold border-opacity-10">
        <p className="text-text-secondary">
          NRETech Brand System • Premium Design for Enterprise Applications
        </p>
      </div>
    </div>
  );
};

export default BrandShowcase;
