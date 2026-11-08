import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:lottie/lottie.dart';
import '../theme.dart';

class GlassBackground extends StatelessWidget {
  const GlassBackground({super.key, required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        const DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                FalconColors.bg1,
                FalconColors.bg2,
                FalconColors.bg3,
              ],
            ),
          ),
        ),
        const Positioned(
          left: -40,
          top: -20,
          child: _GlowOrb(color: Color(0x7A8B7CF6), size: 220),
        ),
        const Positioned(
          right: -50,
          top: 40,
          child: _GlowOrb(color: Color(0x6B6AA8F8), size: 200),
        ),
        const Positioned(
          right: 20,
          bottom: 40,
          child: _GlowOrb(color: Color(0x616ED3B2), size: 240),
        ),
        const Positioned(
          left: -10,
          bottom: 80,
          child: _GlowOrb(color: Color(0x47F2B58A), size: 180),
        ),
        IgnorePointer(
          child: Opacity(
            opacity: 0.38,
            child: Lottie.asset(
              'assets/falcon.json',
              fit: BoxFit.cover,
              repeat: true,
            ),
          ),
        ),
        // Soft light wash so frosted glass has something to refract
        IgnorePointer(
          child: DecoratedBox(
            decoration: BoxDecoration(
              gradient: RadialGradient(
                center: const Alignment(-0.2, -0.45),
                radius: 1.1,
                colors: [
                  Colors.white.withValues(alpha: 0.28),
                  Colors.transparent,
                ],
              ),
            ),
            child: const SizedBox.expand(),
          ),
        ),
        child,
      ],
    );
  }
}

class _GlowOrb extends StatelessWidget {
  const _GlowOrb({required this.color, required this.size});
  final Color color;
  final double size;

  @override
  Widget build(BuildContext context) {
    return ImageFiltered(
      imageFilter: ImageFilter.blur(sigmaX: 36, sigmaY: 36),
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: color,
        ),
      ),
    );
  }
}

class GlassCard extends StatelessWidget {
  const GlassCard({
    super.key,
    required this.child,
    this.strong = false,
    this.padding = const EdgeInsets.all(16),
    this.radius = 28,
  });

  final Widget child;
  final bool strong;
  final EdgeInsets padding;
  final double radius;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(radius),
        boxShadow: const [
          BoxShadow(
            color: Color(0x24504A82),
            blurRadius: 28,
            offset: Offset(0, 14),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(radius),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 26, sigmaY: 26),
          child: DecoratedBox(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(radius),
              border: Border.all(
                color: Colors.white.withValues(alpha: strong ? 0.72 : 0.55),
                width: 1.1,
              ),
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: strong
                    ? [
                        Colors.white.withValues(alpha: 0.62),
                        Colors.white.withValues(alpha: 0.28),
                        Colors.white.withValues(alpha: 0.42),
                      ]
                    : [
                        Colors.white.withValues(alpha: 0.48),
                        Colors.white.withValues(alpha: 0.18),
                        Colors.white.withValues(alpha: 0.32),
                      ],
                stops: const [0.0, 0.48, 1.0],
              ),
            ),
            child: Stack(
              children: [
                Positioned(
                  left: 0,
                  right: 0,
                  top: 0,
                  height: 1.5,
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          Colors.white.withValues(alpha: 0.0),
                          Colors.white.withValues(alpha: 0.85),
                          Colors.white.withValues(alpha: 0.0),
                        ],
                      ),
                    ),
                  ),
                ),
                Padding(padding: padding, child: child),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class GlassToolbar extends StatelessWidget {
  const GlassToolbar({super.key, required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      radius: 22,
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      child: child,
    );
  }
}

class GlassPill extends StatelessWidget {
  const GlassPill({
    super.key,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(999),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          curve: Curves.easeOut,
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(999),
            color: selected
                ? FalconColors.ink.withValues(alpha: 0.92)
                : Colors.white.withValues(alpha: 0.34),
            border: Border.all(
              color: selected
                  ? Colors.white.withValues(alpha: 0.18)
                  : Colors.white.withValues(alpha: 0.55),
            ),
            boxShadow: selected
                ? const [
                    BoxShadow(
                      color: Color(0x331D1B24),
                      blurRadius: 12,
                      offset: Offset(0, 4),
                    ),
                  ]
                : null,
          ),
          child: Text(
            label,
            style: TextStyle(
              color: selected ? Colors.white : FalconColors.muted,
              fontWeight: FontWeight.w700,
              fontSize: 13.5,
            ),
          ),
        ),
      ),
    );
  }
}

class FalconButton extends StatelessWidget {
  const FalconButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.ghost = false,
    this.danger = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final bool ghost;
  final bool danger;

  @override
  Widget build(BuildContext context) {
    if (ghost) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(999),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
          child: FilledButton(
            onPressed: onPressed,
            style: FilledButton.styleFrom(
              backgroundColor: Colors.white.withValues(alpha: 0.42),
              foregroundColor: FalconColors.ink,
              shape: const StadiumBorder(),
              side: BorderSide(color: Colors.white.withValues(alpha: 0.65)),
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
              elevation: 0,
            ),
            child:
                Text(label, style: const TextStyle(fontWeight: FontWeight.w700)),
          ),
        ),
      );
    }

    final bg = danger ? FalconColors.danger : FalconColors.ink;
    return FilledButton(
      onPressed: onPressed,
      style: FilledButton.styleFrom(
        backgroundColor: bg.withValues(alpha: 0.94),
        foregroundColor: Colors.white,
        shape: const StadiumBorder(),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
        elevation: 0,
        shadowColor: bg.withValues(alpha: 0.35),
      ),
      child: Text(label, style: const TextStyle(fontWeight: FontWeight.w700)),
    );
  }
}

class EmptyHint extends StatelessWidget {
  const EmptyHint({super.key, required this.title, required this.body});
  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      radius: 18,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title,
              style: const TextStyle(
                  fontWeight: FontWeight.w700, color: FalconColors.ink)),
          const SizedBox(height: 6),
          Text(body, style: const TextStyle(color: FalconColors.muted)),
        ],
      ),
    );
  }
}

InputDecoration glassFieldDecoration(String label) {
  return InputDecoration(
    labelText: label,
    filled: true,
    fillColor: Colors.white.withValues(alpha: 0.38),
    labelStyle: const TextStyle(color: FalconColors.muted),
    enabledBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(16),
      borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.65)),
    ),
    focusedBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(16),
      borderSide: const BorderSide(color: FalconColors.violet, width: 1.4),
    ),
    border: OutlineInputBorder(
      borderRadius: BorderRadius.circular(16),
      borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.65)),
    ),
  );
}
