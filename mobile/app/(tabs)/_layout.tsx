import React from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { colors, radius, spacing } from '../../src/theme';
import { useLanguage } from '../../src/i18n/LanguageProvider';
import { useCart } from '../../src/store/CartProvider';
import { T } from '../../src/components/ui';
import { TabGlyph, type TabGlyphName } from '../../src/components/TabGlyph';

/**
 * The bottom bar, built to match the website's own rather than the platform
 * default: a pill behind the active tab, the label under the icon, and the
 * basket carrying a count.
 *
 * The order is reversed for Kurdish and Arabic so "Home" sits under the
 * thumb on the side the language is read from.
 */
function TabIcon({ name, focused, label, badge }: { name: TabGlyphName; focused: boolean; label: string; badge?: number }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: 68, paddingTop: 6 }}>
      <View
        style={{
          paddingHorizontal: spacing.lg,
          paddingVertical: 5,
          borderRadius: radius.pill,
          backgroundColor: focused ? colors.candy[50] : 'transparent',
        }}
      >
        <TabGlyph
          name={name}
          size={22}
          color={focused ? colors.candy[600] : colors.slate[400]}
        />
        {badge && badge > 0 ? (
          <View
            style={{
              position: 'absolute',
              top: -2,
              right: 4,
              minWidth: 17,
              height: 17,
              paddingHorizontal: 4,
              borderRadius: radius.pill,
              backgroundColor: colors.candy[500],
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1.5,
              borderColor: colors.white,
            }}
          >
            <T size="xs" weight="black" color={colors.white} style={{ fontSize: 9, lineHeight: 12 }}>
              {badge > 99 ? '99+' : String(badge)}
            </T>
          </View>
        ) : null}
      </View>

      <T
        size="xs"
        weight="black"
        color={focused ? colors.candy[700] : colors.slate[400]}
        numberOfLines={1}
        style={{ marginTop: 2, fontSize: 10, lineHeight: 14 }}
      >
        {label}
      </T>
    </View>
  );
}

export default function TabsLayout() {
  const { t, isRTL } = useLanguage();
  const { itemCount, wishlist } = useCart();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          height: 74,
          paddingTop: 4,
          backgroundColor: colors.surface,
          borderTopColor: colors.slate[100],
          flexDirection: isRTL ? 'row-reverse' : 'row',
        },
        tabBarItemStyle: { paddingVertical: 0 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} label={t('home')} />,
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="shop" focused={focused} label={t('shop')} />,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="basket" focused={focused} label={t('cart')} badge={itemCount} />
          ),
        }}
      />
      <Tabs.Screen
        name="wishlist"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="heart" focused={focused} label={t('wishlist')} badge={wishlist.length} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="user" focused={focused} label={t('account')} />,
        }}
      />
    </Tabs>
  );
}
