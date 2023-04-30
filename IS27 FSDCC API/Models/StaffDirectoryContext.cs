using Microsoft.EntityFrameworkCore;
using IS27_FSDCC_API.Models;

namespace IS27_FSDCC_API.Models
{
    public class StaffDirectoryContext : DbContext
    {
        public StaffDirectoryContext(DbContextOptions<StaffDirectoryContext> options) : base(options)
        {
        }

        public DbSet<Position> Positions { get; set; } = null!;

        public DbSet<Employee> Employees { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Position>()
                .HasMany(e => e.Subordinates)
                .WithOne()
                .HasForeignKey(e => e.SupervisorPositionNumber)
                .IsRequired(false);

            modelBuilder.Entity<Position>().HasData(
                new Position(1,"Director"),
                new Position(2, "Senior Manager 1") { SupervisorPositionNumber = 1},
                new Position(3, "Senior Mangager 2") { SupervisorPositionNumber = 1},
                new Position(4, "Manager 1") { SupervisorPositionNumber = 2},
                new Position(5, "Senior Developer") { SupervisorPositionNumber = 4},
                new Position(6, "Junior Developer") { SupervisorPositionNumber = 5}
            );
        }

    }
}
