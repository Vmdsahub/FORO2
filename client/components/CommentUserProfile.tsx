interface CommentUserProfileProps {
  userId: string;
  userName: string;
  userAvatar: string;
  isTopicAuthor?: boolean;
  size?: "sm" | "md";
}

export default function CommentUserProfile({
  userId,
  userName,
  userAvatar,
  isTopicAuthor = false,
  size = "sm",
}: CommentUserProfileProps) {
  const avatarSize = size === "sm" ? "w-8 h-8" : "w-10 h-10";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Avatar */}
      <div
        className={`${avatarSize} rounded-full bg-black text-white flex items-center justify-center ${textSize} font-semibold flex-shrink-0 hover:bg-gray-800 transition-colors cursor-pointer overflow-hidden`}
      >
        {userAvatar.startsWith("http") ? (
          <img
            src={userAvatar}
            alt={userName}
            className="w-full h-full object-cover"
          />
        ) : (
          userAvatar
        )}
      </div>

      {/* Nome do usuário */}
      <div className="text-center">
        <div
          className={`font-medium text-black ${textSize} leading-tight hover:text-gray-700 cursor-pointer transition-colors`}
        >
          {userName}
        </div>
      </div>
    </div>
  );
}
