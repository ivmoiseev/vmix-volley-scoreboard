/**
 * Переиспользуемая кнопка с вариантами оформления из design tokens.
 * Используется для унификации кнопок по всему приложению.
 */
import { space, radius } from '../theme/tokens';

const variantStyles = {
  primary: {
    backgroundColor: 'var(--color-primary)',
    color: 'white',
    border: 'none',
  },
  secondary: {
    backgroundColor: 'var(--color-neutral)',
    color: 'white',
    border: 'none',
  },
  success: {
    backgroundColor: 'var(--color-success)',
    color: 'white',
    border: 'none',
  },
  danger: {
    backgroundColor: 'var(--color-danger)',
    color: 'white',
    border: 'none',
  },
  warning: {
    backgroundColor: 'var(--color-warning)',
    color: 'white',
    border: 'none',
  },
  accent: {
    backgroundColor: 'var(--color-accent)',
    color: 'white',
    border: 'none',
  },
};

const baseStyle = {
  padding: `${space.sm} ${space.md}`,
  fontSize: '1rem',
  borderRadius: radius.sm,
  cursor: 'pointer',
  opacity: 1,
  fontFamily: 'inherit',
};

export default function Button({
  variant = 'primary',
  disabled = false,
  onClick,
  type = 'button',
  children,
  className = '',
  style = {},
  'aria-label': ariaLabel,
  ...rest
}) {
  const variantStyle = variantStyles[variant] || variantStyles.primary;
  const combinedStyle = {
    ...baseStyle,
    ...variantStyle,
    ...(disabled && { opacity: 0.7, cursor: 'not-allowed' }),
    ...style,
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={className}
      style={combinedStyle}
      aria-label={ariaLabel}
      {...rest}
    >
      {children}
    </button>
  );
}
