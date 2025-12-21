import { useState } from 'react';
import { Logo } from './Logo';

/**
 * Logo Showcase Component
 * Displays all three logo variations with different variants
 * Used for design documentation and UI testing
 */
export const LogoShowcase = () => {
  const [selectedStyle, setSelectedStyle] = useState<'circular' | 'geometric' | 'monogram'>('circular');
  const [isDark, setIsDark] = useState(true);

  const styles: Array<'circular' | 'geometric' | 'monogram'> = ['circular', 'geometric', 'monogram'];
  const variants: Array<'full' | 'icon' | 'horizontal'> = ['full', 'icon', 'horizontal'];

  const styleDescriptions = {
    circular: 'Orbital design with data nodes - represents connection and growth',
    geometric: 'Hexagonal network pattern - symbolizes data integration and unity',
    monogram: 'NT shield badge - premium, recognizable monogram for small scales',
  };

  return (
    <div className={`p-8 ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-4xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            NRETech Logo System
          </h1>
          <p className={`text-lg ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            Three professional variations optimized for Marketing & CRM
          </p>
        </div>

        {/* Controls */}
        <div className={`mb-8 p-6 rounded-lg ${isDark ? 'bg-slate-900' : 'bg-white'} border ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className="grid grid-cols-2 gap-6">
            {/* Style selector */}
            <div>
              <label className={`block text-sm font-semibold mb-3 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                Logo Style
              </label>
              <div className="flex flex-wrap gap-2">
                {styles.map((style) => (
                  <button
                    key={style}
                    onClick={() => setSelectedStyle(style)}
                    className={`px-4 py-2 rounded-lg font-medium transition ${
                      selectedStyle === style
                        ? 'bg-amber-500 text-slate-900'
                        : isDark
                        ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                  >
                    {style.charAt(0).toUpperCase() + style.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Theme toggle */}
            <div>
              <label className={`block text-sm font-semibold mb-3 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                Theme
              </label>
              <button
                onClick={() => setIsDark(!isDark)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  isDark
                    ? 'bg-amber-500 text-slate-900'
                    : 'bg-slate-700 text-white'
                }`}
              >
                {isDark ? '🌙 Dark Mode' : '☀️ Light Mode'}
              </button>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className={`mb-8 p-6 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-blue-50'} border ${isDark ? 'border-slate-700' : 'border-blue-200'}`}>
          <p className={`${isDark ? 'text-slate-300' : 'text-blue-900'}`}>
            <strong>{selectedStyle.charAt(0).toUpperCase() + selectedStyle.slice(1)}:</strong> {styleDescriptions[selectedStyle]}
          </p>
        </div>

        {/* Logo Variations Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {variants.map((variant) => (
            <div
              key={variant}
              className={`p-8 rounded-lg border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}
            >
              <h3 className={`text-sm font-semibold uppercase tracking-wider mb-6 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                {variant === 'full' ? 'Full Logo' : variant === 'icon' ? 'Icon Only' : 'Horizontal'}
              </h3>

              <div className="flex items-center justify-center min-h-64">
                <Logo
                  variant={variant}
                  style={selectedStyle}
                  isDark={isDark}
                  showTagline={variant === 'full'}
                  animate={true}
                />
              </div>

              <p className={`text-xs mt-4 text-center ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                {variant === 'full'
                  ? 'Complete branding with text and slogan'
                  : variant === 'icon'
                  ? 'Icon only for favicons and compact spaces'
                  : 'Compact horizontal layout for headers'}
              </p>
            </div>
          ))}
        </div>

        {/* Dark Mode Preview */}
        <div className={`p-8 rounded-lg ${isDark ? 'bg-slate-900' : 'bg-slate-900'} border border-slate-800 mb-8`}>
          <h3 className="text-lg font-bold text-white mb-6">Dark Mode Integration</h3>
          <div className="grid grid-cols-3 gap-6">
            {variants.map((variant) => (
              <div key={variant} className="flex flex-col items-center gap-4">
                <div className="w-full aspect-square rounded-lg bg-slate-800 p-4 flex items-center justify-center">
                  <Logo
                    variant={variant}
                    style={selectedStyle}
                    isDark={true}
                    showTagline={variant === 'full'}
                    animate={false}
                  />
                </div>
                <p className="text-xs text-slate-400 text-center">
                  {variant === 'full' ? 'Full' : variant === 'icon' ? 'Icon' : 'Horizontal'}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Light Mode Preview */}
        <div className={`p-8 rounded-lg bg-white border border-slate-200 mb-8`}>
          <h3 className="text-lg font-bold text-slate-900 mb-6">Light Mode Integration</h3>
          <div className="grid grid-cols-3 gap-6">
            {variants.map((variant) => (
              <div key={variant} className="flex flex-col items-center gap-4">
                <div className="w-full aspect-square rounded-lg bg-slate-100 p-4 flex items-center justify-center">
                  <Logo
                    variant={variant}
                    style={selectedStyle}
                    isDark={false}
                    showTagline={variant === 'full'}
                    animate={false}
                  />
                </div>
                <p className="text-xs text-slate-600 text-center">
                  {variant === 'full' ? 'Full' : variant === 'icon' ? 'Icon' : 'Horizontal'}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Design Specifications */}
        <div className={`p-8 rounded-lg ${isDark ? 'bg-slate-900' : 'bg-slate-50'} border ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <h3 className={`text-lg font-bold mb-6 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Design Specifications
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className={`font-semibold mb-3 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                Color Palette
              </h4>
              <ul className={`space-y-2 text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                <li className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded bg-yellow-500" />
                  Primary Gold: #d4af37 (Premium)
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded bg-yellow-400" />
                  Light Gold: #eab308 (Highlights)
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded bg-slate-900" />
                  Dark Navy: #0d1117 (Background)
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded bg-slate-700" />
                  Dark Alt: #1a1f27 (Depth)
                </li>
              </ul>
            </div>

            <div>
              <h4 className={`font-semibold mb-3 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                Typography
              </h4>
              <ul className={`space-y-2 text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                <li>Font: Plus Jakarta Sans (Bold)</li>
                <li>Slogan: Uppercase, letter-spaced</li>
                <li>Scalable: SVG format for all sizes</li>
                <li>Animatable: Hover and spin effects</li>
              </ul>
            </div>
          </div>

          <div className={`mt-6 p-4 rounded ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
            <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              <strong>Brand Slogan:</strong> "IT'S TIME TO MAKE IT" — Integrated below wordmark in all full variations
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
