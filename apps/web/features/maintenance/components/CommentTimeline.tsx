'use client';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { commentSchema, CommentFormValues } from '../schemas';
import { WorkOrderComment } from '../types';
import { Button } from '@/components/ui/button';
import { MessageSquare, User, Clock } from 'lucide-react';

interface CommentTimelineProps {
  comments?: WorkOrderComment[];
  onAddComment: (values: CommentFormValues) => void;
  submitting?: boolean;
}

export function CommentTimeline({
  comments = [],
  onAddComment,
  submitting = false,
}: CommentTimelineProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CommentFormValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: {
      commentText: '',
    },
  });

  const onSubmit = (values: CommentFormValues) => {
    onAddComment(values);
    reset();
  };

  return (
    <div className="space-y-6">
      <h3 className="font-semibold text-lg text-foreground flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-primary" /> Comments Timeline
      </h3>

      {/* Comment submission form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div className="space-y-1">
          <textarea
            id="timeline-comment-text"
            placeholder="Write a message or upload repair updates..."
            disabled={submitting}
            {...register('commentText')}
            className="w-full min-h-[80px] rounded-md border border-input bg-card p-3 text-sm text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring"
          />
          {errors.commentText && (
            <p className="text-xs font-semibold text-destructive">{errors.commentText.message}</p>
          )}
        </div>
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={submitting}>
            {submitting ? 'Posting...' : 'Post Comment'}
          </Button>
        </div>
      </form>

      {/* Comments list */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2 italic">No comments posted yet.</p>
        ) : (
          <div className="relative pl-6 border-l border-border space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="relative space-y-1 bg-muted/20 p-3 rounded-lg border border-border/55">
                {/* Visual bullet indicator */}
                <div className="absolute -left-[31px] top-4 bg-background border border-border h-4.5 w-4.5 rounded-full flex items-center justify-center">
                  <User className="h-2.5 w-2.5 text-muted-foreground" />
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-bold text-foreground">
                    {comment.author?.fullName || 'Anonymous'}
                    {comment.author?.role && (
                      <span className="ml-1.5 font-normal text-xs text-muted-foreground border border-border/50 px-1 py-0.25 rounded-sm uppercase">
                        {comment.author.role.toLowerCase()}
                      </span>
                    )}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(comment.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-foreground mt-1 leading-relaxed">
                  {comment.commentText}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
