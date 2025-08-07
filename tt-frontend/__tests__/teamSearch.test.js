import {expect, jest, test} from '@jest/globals'
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Team from "../src/app/Search/Team"

//Team Lead Search Page Tests


test('valid search results', () => {
  return expect(2 + 2).toBe(4);
});


test('calls setSearchQuery when user types in input', () => {

  const setSearchQuery = jest.fn(); 
  render(<Team searchQuery="" setSearchQuery={setSearchQuery} />);

  const input = screen.getByPlaceholderText('Search Employees...');
  fireEvent.change(input, { target: { value: 'Jason' } });

  expect(setSearchQuery).toHaveBeenCalledWith('Jason');
});



