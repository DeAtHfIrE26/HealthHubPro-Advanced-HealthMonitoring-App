import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import StatCard from './StatCard';

describe('StatCard Component', () => {
  test('renders with positive change', () => {
    render(
      <StatCard
        type="calories"
        value="2,500"
        change={5}
        icon="fa-fire"
        bgColor="bg-orange-100"
        textColor="text-orange-500"
      />
    );

    expect(screen.getByText('calories')).toBeInTheDocument();
    expect(screen.getByText('2,500')).toBeInTheDocument();
    expect(screen.getByText('5%')).toBeInTheDocument();
    expect(screen.getByText('vs last week')).toBeInTheDocument();
    
    // Check if the icon is rendered
    const iconElement = document.querySelector('.fas.fa-fire');
    expect(iconElement).toBeInTheDocument();
    
    // Check if the background color is applied
    const bgElement = document.querySelector('.bg-orange-100');
    expect(bgElement).toBeInTheDocument();
    
    // Check if the text color is applied
    const textColorElement = document.querySelector('.text-orange-500');
    expect(textColorElement).toBeInTheDocument();
  });

  test('renders with negative change', () => {
    render(
      <StatCard
        type="steps"
        value="8,200"
        change={-3}
        icon="fa-shoe-prints"
        bgColor="bg-blue-100"
        textColor="text-blue-500"
      />
    );

    expect(screen.getByText('steps')).toBeInTheDocument();
    expect(screen.getByText('8,200')).toBeInTheDocument();
    expect(screen.getByText('3%')).toBeInTheDocument();
    
    // Check if the down arrow icon is rendered for negative change
    const downArrowIcon = document.querySelector('.fas.fa-arrow-down');
    expect(downArrowIcon).toBeInTheDocument();
  });

  test('renders with no change', () => {
    render(
      <StatCard
        type="workouts"
        value="12"
        change={0}
        icon="fa-dumbbell"
        bgColor="bg-purple-100"
        textColor="text-purple-500"
      />
    );

    expect(screen.getByText('workouts')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('No change vs last week')).toBeInTheDocument();
  });
}); 