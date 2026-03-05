import React from 'react';
import { cn } from '@/lib/utils';
import styles from './hamster-loader.module.css';
interface HamsterLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string | undefined;
}
export const HamsterLoader: React.FC<HamsterLoaderProps> = ({
  size = 'md',
  className
}) => {
  const sizeClass = {
    sm: styles.sizeSm,
    md: styles.sizeMd,
    lg: styles.sizeLg
  }[size];
  return <div className={cn(styles.wheelAndHamster, sizeClass, className)}>
      <div aria-label="Orange and tan hamster running in a metal wheel" role="img" className="">
        <div className={styles.wheel} />
        <div className={styles.hamster}>
          <div className={styles.hamsterBody}>
            <div className={styles.hamsterHead}>
              <div className={styles.hamsterEar} />
              <div className={styles.hamsterEye} />
              <div className={styles.hamsterNose} />
            </div>
            <div className={cn(styles.hamsterLimb, styles.hamsterLimbFr)} />
            <div className={cn(styles.hamsterLimb, styles.hamsterLimbFl)} />
            <div className={cn(styles.hamsterLimb, styles.hamsterLimbBr)} />
            <div className={cn(styles.hamsterLimb, styles.hamsterLimbBl)} />
            <div className={styles.hamsterTail} />
          </div>
        </div>
        <div className={styles.spoke} />
      </div>
    </div>;
};
export default HamsterLoader;