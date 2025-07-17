'use client';

import React, { useState } from 'react';
import { useCustomization } from '@/lib/customization';
import { cn } from '@/lib/utils';

interface CustomizationSettingsProps {
  className?: string;
  defaultTab?: 'layout' | 'display' | 'notifications' | 'privacy' | 'accessibility';
}

export function CustomizationSettings({
  className,
  defaultTab = 'layout',
}: CustomizationSettingsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const _customization = useCustomization();

  const tabs = [
    { id: 'layout', label: 'Layout', icon: '📐' },
    { id: 'display', label: 'Display', icon: '🎨' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'privacy', label: 'Privacy', icon: '🔒' },
    { id: 'accessibility', label: 'Accessibility', icon: '♿' },
  ] as const;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Tab Navigation */}
      <div className="border-b border-border">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors',
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text hover:text-primary'
              )}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'layout' && <LayoutSettings />}
        {activeTab === 'display' && <DisplaySettings />}
        {activeTab === 'notifications' && <NotificationSettings />}
        {activeTab === 'privacy' && <PrivacySettings />}
        {activeTab === 'accessibility' && <AccessibilitySettings />}
      </div>
    </div>
  );
}

// Layout Settings Component
function LayoutSettings() {
  const { layout, updateLayout } = useCustomization();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Layout Settings</h3>
        
        {/* Sidebar Settings */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Sidebar Position</label>
            <select
              value={layout.sidebar.position}
              onChange={(e) => updateLayout({ sidebar: { ...layout.sidebar, position: e.target.value as 'left' | 'right' } })}
              className="w-full p-2 border border-border rounded-md bg-surface text-text"
            >
              <option value="left">Left</option>
              <option value="right">Right</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Sidebar Width: {layout.sidebar.width}px
            </label>
            <input
              type="range"
              min="200"
              max="400"
              value={layout.sidebar.width}
              onChange={(e) => updateLayout({ sidebar: { ...layout.sidebar, width: parseInt(e.target.value) } })}
              className="w-full"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="sidebar-collapsed"
              checked={layout.sidebar.collapsed}
              onChange={(e) => updateLayout({ sidebar: { ...layout.sidebar, collapsed: e.target.checked } })}
              className="rounded border-border"
            />
            <label htmlFor="sidebar-collapsed" className="text-sm">
              Collapse sidebar by default
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="sidebar-auto-collapse"
              checked={layout.sidebar.autoCollapse}
              onChange={(e) => updateLayout({ sidebar: { ...layout.sidebar, autoCollapse: e.target.checked } })}
              className="rounded border-border"
            />
            <label htmlFor="sidebar-auto-collapse" className="text-sm">
              Auto-collapse on mobile
            </label>
          </div>
        </div>

        {/* Header Settings */}
        <div className="space-y-4 mt-6">
          <h4 className="text-md font-medium">Header</h4>
          
          <div>
            <label className="block text-sm font-medium mb-2">
              Header Height: {layout.header.height}px
            </label>
            <input
              type="range"
              min="50"
              max="100"
              value={layout.header.height}
              onChange={(e) => updateLayout({ header: { ...layout.header, height: parseInt(e.target.value) } })}
              className="w-full"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="header-sticky"
              checked={layout.header.sticky}
              onChange={(e) => updateLayout({ header: { ...layout.header, sticky: e.target.checked } })}
              className="rounded border-border"
            />
            <label htmlFor="header-sticky" className="text-sm">
              Sticky header
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="show-breadcrumbs"
              checked={layout.header.showBreadcrumbs}
              onChange={(e) => updateLayout({ header: { ...layout.header, showBreadcrumbs: e.target.checked } })}
              className="rounded border-border"
            />
            <label htmlFor="show-breadcrumbs" className="text-sm">
              Show breadcrumbs
            </label>
          </div>
        </div>

        {/* Content Settings */}
        <div className="space-y-4 mt-6">
          <h4 className="text-md font-medium">Content</h4>
          
          <div>
            <label className="block text-sm font-medium mb-2">
              Max Width: {layout.content.maxWidth}px
            </label>
            <input
              type="range"
              min="800"
              max="1400"
              value={layout.content.maxWidth}
              onChange={(e) => updateLayout({ content: { ...layout.content, maxWidth: parseInt(e.target.value) } })}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Padding: {layout.content.padding}px
            </label>
            <input
              type="range"
              min="16"
              max="48"
              value={layout.content.padding}
              onChange={(e) => updateLayout({ content: { ...layout.content, padding: parseInt(e.target.value) } })}
              className="w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Display Settings Component
function DisplaySettings() {
  const { display, updateDisplay } = useCustomization();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Display Settings</h3>
        
        {/* Font Settings */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Font Size</label>
            <select
              value={display.fontSize}
              onChange={(e) => updateDisplay({ fontSize: e.target.value as 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' })}
              className="w-full p-2 border border-border rounded-md bg-surface text-text"
            >
              <option value="xs">Extra Small</option>
              <option value="sm">Small</option>
              <option value="base">Base</option>
              <option value="lg">Large</option>
              <option value="xl">Extra Large</option>
              <option value="2xl">2XL</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Line Height</label>
            <select
              value={display.lineHeight}
              onChange={(e) => updateDisplay({ lineHeight: e.target.value as 'tight' | 'normal' | 'relaxed' })}
              className="w-full p-2 border border-border rounded-md bg-surface text-text"
            >
              <option value="tight">Tight</option>
              <option value="normal">Normal</option>
              <option value="relaxed">Relaxed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Spacing</label>
            <select
              value={display.spacing}
              onChange={(e) => updateDisplay({ spacing: e.target.value as 'compact' | 'normal' | 'comfortable' })}
              className="w-full p-2 border border-border rounded-md bg-surface text-text"
            >
              <option value="compact">Compact</option>
              <option value="normal">Normal</option>
              <option value="comfortable">Comfortable</option>
            </select>
          </div>
        </div>

        {/* Animation Settings */}
        <div className="space-y-4 mt-6">
          <h4 className="text-md font-medium">Animations</h4>
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="animations-enabled"
              checked={display.animations.enabled}
              onChange={(e) => updateDisplay({ animations: { ...display.animations, enabled: e.target.checked } })}
              className="rounded border-border"
            />
            <label htmlFor="animations-enabled" className="text-sm">
              Enable animations
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Animation Speed</label>
            <select
              value={display.animations.duration}
              onChange={(e) => updateDisplay({ animations: { ...display.animations, duration: e.target.value as 'fast' | 'normal' | 'slow' } })}
              className="w-full p-2 border border-border rounded-md bg-surface text-text"
            >
              <option value="fast">Fast</option>
              <option value="normal">Normal</option>
              <option value="slow">Slow</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="reduced-motion"
              checked={display.animations.reducedMotion}
              onChange={(e) => updateDisplay({ animations: { ...display.animations, reducedMotion: e.target.checked } })}
              className="rounded border-border"
            />
            <label htmlFor="reduced-motion" className="text-sm">
              Reduce motion (accessibility)
            </label>
          </div>
        </div>

        {/* Color Settings */}
        <div className="space-y-4 mt-6">
          <h4 className="text-md font-medium">Colors</h4>
          
          <div>
            <label className="block text-sm font-medium mb-2">Saturation</label>
            <select
              value={display.colors.saturation}
              onChange={(e) => updateDisplay({ colors: { ...display.colors, saturation: e.target.value as 'muted' | 'normal' | 'vibrant' } })}
              className="w-full p-2 border border-border rounded-md bg-surface text-text"
            >
              <option value="muted">Muted</option>
              <option value="normal">Normal</option>
              <option value="vibrant">Vibrant</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Contrast</label>
            <select
              value={display.colors.contrast}
              onChange={(e) => updateDisplay({ colors: { ...display.colors, contrast: e.target.value as 'low' | 'normal' | 'high' } })}
              className="w-full p-2 border border-border rounded-md bg-surface text-text"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

// Notification Settings Component
function NotificationSettings() {
  const { notifications, updateNotifications } = useCustomization();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Notification Settings</h3>
        
        <div className="flex items-center gap-2 mb-4">
          <input
            type="checkbox"
            id="notifications-enabled"
            checked={notifications.enabled}
            onChange={(e) => updateNotifications({ enabled: e.target.checked })}
            className="rounded border-border"
          />
          <label htmlFor="notifications-enabled" className="text-sm font-medium">
            Enable notifications
          </label>
        </div>

        {/* Notification Types */}
        <div className="space-y-3">
          <h4 className="text-md font-medium">Notification Types</h4>
          
          {Object.entries(notifications.types).map(([key, value]) => (
            <div key={key} className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`notification-${key}`}
                checked={value}
                onChange={(e) => updateNotifications({
                  types: { ...notifications.types, [key]: e.target.checked }
                })}
                className="rounded border-border"
                disabled={!notifications.enabled}
              />
              <label htmlFor={`notification-${key}`} className="text-sm capitalize">
                {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
              </label>
            </div>
          ))}
        </div>

        {/* Sound Settings */}
        <div className="space-y-4 mt-6">
          <h4 className="text-md font-medium">Sound</h4>
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="sound-enabled"
              checked={notifications.sound.enabled}
              onChange={(e) => updateNotifications({
                sound: { ...notifications.sound, enabled: e.target.checked }
              })}
              className="rounded border-border"
            />
            <label htmlFor="sound-enabled" className="text-sm">
              Enable sound
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Volume: {notifications.sound.volume}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={notifications.sound.volume}
              onChange={(e) => updateNotifications({
                sound: { ...notifications.sound, volume: parseInt(e.target.value) }
              })}
              className="w-full"
              disabled={!notifications.sound.enabled}
            />
          </div>
        </div>

        {/* Position and Duration */}
        <div className="space-y-4 mt-6">
          <div>
            <label className="block text-sm font-medium mb-2">Position</label>
            <select
              value={notifications.position}
              onChange={(e) => updateNotifications({ position: e.target.value as 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' })}
              className="w-full p-2 border border-border rounded-md bg-surface text-text"
            >
              <option value="top-right">Top Right</option>
              <option value="top-left">Top Left</option>
              <option value="bottom-right">Bottom Right</option>
              <option value="bottom-left">Bottom Left</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Duration: {notifications.duration / 1000}s
            </label>
            <input
              type="range"
              min="2000"
              max="10000"
              step="1000"
              value={notifications.duration}
              onChange={(e) => updateNotifications({ duration: parseInt(e.target.value) })}
              className="w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Privacy Settings Component
function PrivacySettings() {
  const { privacy, updatePrivacy } = useCustomization();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Privacy Settings</h3>
        
        {/* Data Sharing */}
        <div className="space-y-4">
          <h4 className="text-md font-medium">Data Sharing</h4>
          
          {Object.entries(privacy.dataSharing).map(([key, value]) => (
            <div key={key} className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`data-sharing-${key}`}
                checked={value}
                onChange={(e) => updatePrivacy({
                  dataSharing: { ...privacy.dataSharing, [key]: e.target.checked }
                })}
                className="rounded border-border"
              />
              <label htmlFor={`data-sharing-${key}`} className="text-sm capitalize">
                {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
              </label>
            </div>
          ))}
        </div>

        {/* Visibility */}
        <div className="space-y-4 mt-6">
          <h4 className="text-md font-medium">Profile Visibility</h4>
          
          {Object.entries(privacy.visibility).map(([key, value]) => (
            <div key={key}>
              <label className="block text-sm font-medium mb-2 capitalize">
                {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
              </label>
              <select
                value={value}
                onChange={(e) => updatePrivacy({
                  visibility: { ...privacy.visibility, [key]: e.target.value as 'public' | 'friends' | 'private' }
                })}
                className="w-full p-2 border border-border rounded-md bg-surface text-text"
              >
                <option value="public">Public</option>
                <option value="friends">Friends Only</option>
                <option value="private">Private</option>
              </select>
            </div>
          ))}
        </div>

        {/* Tracking */}
        <div className="space-y-4 mt-6">
          <h4 className="text-md font-medium">Tracking Permissions</h4>
          
          {Object.entries(privacy.tracking).map(([key, value]) => (
            <div key={key} className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`tracking-${key}`}
                checked={value}
                onChange={(e) => updatePrivacy({
                  tracking: { ...privacy.tracking, [key]: e.target.checked }
                })}
                className="rounded border-border"
              />
              <label htmlFor={`tracking-${key}`} className="text-sm capitalize">
                {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Accessibility Settings Component
function AccessibilitySettings() {
  const { accessibility, updateAccessibility } = useCustomization();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Accessibility Settings</h3>
        
        {/* Screen Reader */}
        <div className="space-y-4">
          <h4 className="text-md font-medium">Screen Reader</h4>
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="screen-reader-enabled"
              checked={accessibility.screenReader.enabled}
              onChange={(e) => updateAccessibility({
                screenReader: { ...accessibility.screenReader, enabled: e.target.checked }
              })}
              className="rounded border-border"
            />
            <label htmlFor="screen-reader-enabled" className="text-sm">
              Enable screen reader support
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="screen-reader-announcements"
              checked={accessibility.screenReader.announcements}
              onChange={(e) => updateAccessibility({
                screenReader: { ...accessibility.screenReader, announcements: e.target.checked }
              })}
              className="rounded border-border"
            />
            <label htmlFor="screen-reader-announcements" className="text-sm">
              Enable announcements
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="skip-links"
              checked={accessibility.screenReader.skipLinks}
              onChange={(e) => updateAccessibility({
                screenReader: { ...accessibility.screenReader, skipLinks: e.target.checked }
              })}
              className="rounded border-border"
            />
            <label htmlFor="skip-links" className="text-sm">
              Show skip links
            </label>
          </div>
        </div>

        {/* Keyboard Navigation */}
        <div className="space-y-4 mt-6">
          <h4 className="text-md font-medium">Keyboard Navigation</h4>
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="keyboard-shortcuts"
              checked={accessibility.keyboard.shortcuts}
              onChange={(e) => updateAccessibility({
                keyboard: { ...accessibility.keyboard, shortcuts: e.target.checked }
              })}
              className="rounded border-border"
            />
            <label htmlFor="keyboard-shortcuts" className="text-sm">
              Enable keyboard shortcuts
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="focus-indicators"
              checked={accessibility.keyboard.focusIndicators}
              onChange={(e) => updateAccessibility({
                keyboard: { ...accessibility.keyboard, focusIndicators: e.target.checked }
              })}
              className="rounded border-border"
            />
            <label htmlFor="focus-indicators" className="text-sm">
              Show focus indicators
            </label>
          </div>
        </div>

        {/* Visual Accessibility */}
        <div className="space-y-4 mt-6">
          <h4 className="text-md font-medium">Visual Accessibility</h4>
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="high-contrast"
              checked={accessibility.visual.highContrast}
              onChange={(e) => updateAccessibility({
                visual: { ...accessibility.visual, highContrast: e.target.checked }
              })}
              className="rounded border-border"
            />
            <label htmlFor="high-contrast" className="text-sm">
              High contrast mode
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="large-text"
              checked={accessibility.visual.largeText}
              onChange={(e) => updateAccessibility({
                visual: { ...accessibility.visual, largeText: e.target.checked }
              })}
              className="rounded border-border"
            />
            <label htmlFor="large-text" className="text-sm">
              Large text
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Color Blindness Support</label>
            <select
              value={accessibility.visual.colorBlind}
              onChange={(e) => updateAccessibility({
                visual: { ...accessibility.visual, colorBlind: e.target.value as 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia' }
              })}
              className="w-full p-2 border border-border rounded-md bg-surface text-text"
            >
              <option value="none">None</option>
              <option value="protanopia">Protanopia (Red-Blind)</option>
              <option value="deuteranopia">Deuteranopia (Green-Blind)</option>
              <option value="tritanopia">Tritanopia (Blue-Blind)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
} 