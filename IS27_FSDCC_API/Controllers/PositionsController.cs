using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using IS27_FSDCC_API.Models;

namespace IS27_FSDCC_API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PositionsController : ControllerBase
    {
        private readonly StaffDirectoryContext _context;

        public PositionsController(StaffDirectoryContext context)
        {
            _context = context;
            // context.Database.EnsureCreated();
        }

        [Route("~/api/StaffDirectory")]
        [HttpGet]
        public async Task<ActionResult<Position?>> GetStaffDirectory()
        {
            if (_context.Positions == null)
            {
                return NotFound();
            }

            var positions = await _context.Positions.Include(e => e.Employee).ToListAsync();
            return positions.SingleOrDefault(e => e.SupervisorPositionNumber == null);
        }

        // GET: api/Position
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Position>>> GetPositions()
        {
          if (_context.Positions == null)
          {
              return NotFound();
          }
            return await _context.Positions.ToListAsync();
        }

        // GET: api/Position/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Position>> GetPosition(int id)
        {
          if (_context.Positions == null)
          {
              return NotFound();
          }
            var position = await _context.Positions.FindAsync(id);

            if (position == null)
            {
                return NotFound();
            }

            return position;
        }

        // PUT: api/Position/5
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPut("{id}")]
        public async Task<IActionResult> PutPosition(int id, Position position)
        {
            if (id != position.PositionNumber)
            {
                return BadRequest();
            }

            _context.Entry(position).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!PositionExists(id))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }

            return NoContent();
        }

        // POST: api/Position
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPost]
        public async Task<ActionResult<Position>> PostPosition(Position position)
        {
          if (_context.Positions == null)
          {
              return Problem("Entity set 'StaffDirectoryContext.Positions'  is null.");
          }
            _context.Positions.Add(position);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetPosition), new { id = position.PositionNumber }, position);
        }

        // DELETE: api/Position/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeletePosition(int id)
        {
            if (_context.Positions == null)
            {
                return NotFound();
            }
            var position = await _context.Positions.FindAsync(id);
            if (position == null)
            {
                return NotFound();
            }

            _context.Positions.Remove(position);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool PositionExists(int id)
        {
            return (_context.Positions?.Any(e => e.PositionNumber == id)).GetValueOrDefault();
        }
    }
}
