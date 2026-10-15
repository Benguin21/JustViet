import { TagInput } from "justviet-app";
import { useState } from "react";

const Demo = ({ initial }: { initial: string[] }) => {
  const [tags, setTags] = useState(initial);
  return (
    <div style={{ width: 360 }}>
      <TagInput label="Tags" value={tags} onChange={setTags} placeholder="food, travel…" />
    </div>
  );
};

export const WithTags = () => <Demo initial={["food", "greetings", "travel"]} />;
export const Empty = () => <Demo initial={[]} />;
