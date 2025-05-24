import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('forum_comments')
export class ForumComment {
  @PrimaryGeneratedColumn()
  id: number = 0;

  @Column()
  postId: number = 0;

  @Column()
  userId: number = 0;

  @Column('text')
  content: string = '';

  @Column()
  ipfsHash: string = '';

  @Column({ default: 0 })
  upvotes: number = 0;

  @Column({ default: 0 })
  downvotes: number = 0;

  @CreateDateColumn()
  createdAt: Date = new Date();

  @UpdateDateColumn()
  updatedAt: Date = new Date();
}
