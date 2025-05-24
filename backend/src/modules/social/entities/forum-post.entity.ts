import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('forum_posts')
export class ForumPost {
  @PrimaryGeneratedColumn()
  id: number = 0;

  @Column()
  userId: number = 0;

  @Column()
  title: string = '';

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
