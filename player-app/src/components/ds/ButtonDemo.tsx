'use client';

import React, { useState } from 'react';
import Button from './Button';
import styles from './ButtonDemo.module.css';

/**
 * Demo component showcasing all Button variants
 * This is for development/documentation purposes
 */
export default function ButtonDemo() {
  const [loading, setLoading] = useState(false);

  const handleClick = (label: string) => {
    console.log(`Clicked: ${label}`);
  };

  const handleLoadingDemo = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <div className={styles.demo}>
      <h1 className={styles.title}>Button Design System</h1>
      
      {/* Sizes Section */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Sizes</h2>
        
        <div className={styles.row}>
          <Button size="small" onClick={() => handleClick('Small Green')}>
            Small (Generate)
          </Button>
          <Button size="medium" onClick={() => handleClick('Medium Green')}>
            Medium (Default)
          </Button>
          <Button size="cta" onClick={() => handleClick('CTA Green')}>
            CTA (Join)
          </Button>
        </div>
      </section>

      {/* Colors Section */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Colors</h2>
        
        <div className={styles.row}>
          <Button color="green" onClick={() => handleClick('Green')}>
            Green (Default)
          </Button>
          <Button color="red" onClick={() => handleClick('Red')}>
            Red
          </Button>
          <Button color="white" onClick={() => handleClick('White')}>
            White (Cancel)
          </Button>
          <Button color="blue" onClick={() => handleClick('Blue')}>
            Blue
          </Button>
        </div>
      </section>

      {/* Size × Color Matrix */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>All Combinations</h2>
        
        <div className={styles.grid}>
          {/* Small Row */}
          <Button size="small" color="green" onClick={() => handleClick('Small Green')}>
            Small Green
          </Button>
          <Button size="small" color="red" onClick={() => handleClick('Small Red')}>
            Small Red
          </Button>
          <Button size="small" color="white" onClick={() => handleClick('Small White')}>
            Small White
          </Button>
          <Button size="small" color="blue" onClick={() => handleClick('Small Blue')}>
            Small Blue
          </Button>

          {/* Medium Row */}
          <Button size="medium" color="green" onClick={() => handleClick('Medium Green')}>
            Medium Green
          </Button>
          <Button size="medium" color="red" onClick={() => handleClick('Medium Red')}>
            Medium Red
          </Button>
          <Button size="medium" color="white" onClick={() => handleClick('Medium White')}>
            Medium White
          </Button>
          <Button size="medium" color="blue" onClick={() => handleClick('Medium Blue')}>
            Medium Blue
          </Button>

          {/* CTA Row */}
          <Button size="cta" color="green" onClick={() => handleClick('CTA Green')}>
            CTA Green
          </Button>
          <Button size="cta" color="red" onClick={() => handleClick('CTA Red')}>
            CTA Red
          </Button>
          <Button size="cta" color="white" onClick={() => handleClick('CTA White')}>
            CTA White
          </Button>
          <Button size="cta" color="blue" onClick={() => handleClick('CTA Blue')}>
            CTA Blue
          </Button>
        </div>
      </section>

      {/* States Section */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>States</h2>
        
        <div className={styles.row}>
          <Button onClick={() => handleClick('Normal')}>
            Normal
          </Button>
          <Button disabled>
            Disabled
          </Button>
          <Button onClick={handleLoadingDemo} disabled={loading}>
            {loading ? 'Loading...' : 'Loading Demo'}
          </Button>
        </div>
      </section>

      {/* Use Cases */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Common Use Cases</h2>
        
        <div className={styles.useCase}>
          <h3>AI Creation Flow</h3>
          <div className={styles.row}>
            <Button size="small" color="white" onClick={() => handleClick('Cancel')}>
              Cancel
            </Button>
            <Button size="small" color="green" onClick={() => handleClick('Generate')}>
              Generate
            </Button>
            <Button size="small" color="blue" onClick={() => handleClick('Save')}>
              Save & Use
            </Button>
          </div>
        </div>

        <div className={styles.useCase}>
          <h3>Home Page CTA</h3>
          <div className={styles.row}>
            <Button size="cta" color="green" onClick={() => handleClick('Join Waitlist')}>
              Join the waitlist
            </Button>
          </div>
        </div>

        <div className={styles.useCase}>
          <h3>Destructive Action</h3>
          <div className={styles.row}>
            <Button size="small" color="white" onClick={() => handleClick('Cancel Delete')}>
              Cancel
            </Button>
            <Button size="small" color="red" onClick={() => handleClick('Confirm Delete')}>
              Delete Visualization
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

