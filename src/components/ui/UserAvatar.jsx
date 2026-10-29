/**
 * The signed-in user's profile picture: their Google photo, or a gradient circle with their initial
 * (JioHotstar shows a coloured avatar in the rail the same way).
 */
export default function UserAvatar({ user, size = 28, ring = false, className = '' }) {
  const box = { width: size, height: size };
  const ringClass = ring ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0f1014]' : '';
  if (user?.avatar) {
    return <img src={user.avatar} alt="" referrerPolicy="no-referrer" style={box} className={`rounded-full object-cover flex-shrink-0 ${ringClass} ${className}`} />;
  }
  return (
    <span
      aria-hidden="true"
      style={{ ...box, fontSize: Math.round(size * 0.46), background: 'linear-gradient(135deg, #1492ff, #0860c4 55%, #7a1fa2)' }}
      className={`rounded-full inline-flex items-center justify-center font-bold text-white flex-shrink-0 select-none ${ringClass} ${className}`}
    >
      {user?.name?.[0]?.toUpperCase() || '?'}
    </span>
  );
}
