import { PostList } from '@/components/post-list'
import { getPosts } from '@/lib/posts'

export default function Page() {
  return (
    <div className="mx-auto w-full max-w-160">
      <PostList posts={getPosts()} />
    </div>
  )
}
