<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_batches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('medicine_id')->constrained()->cascadeOnDelete();
            $table->string('batch_number');
            $table->string('location')->default('Gudang Utama Farmasi');
            $table->string('storage_location')->nullable();
            $table->integer('quantity')->default(0);
            $table->integer('initial_quantity')->default(0);
            $table->integer('unit_price')->default(0);
            $table->date('expired_at')->nullable()->index();
            $table->date('received_at')->nullable()->index();
            $table->string('note')->nullable();
            $table->timestamps();

            $table->unique(['medicine_id', 'batch_number']);
        });

        $now = now();

        DB::table('medicines')
            ->where('stock', '>', 0)
            ->orderBy('id')
            ->chunkById(200, function ($medicines) use ($now): void {
                $rows = [];

                foreach ($medicines as $medicine) {
                    $rows[] = [
                        'medicine_id' => $medicine->id,
                        'batch_number' => 'BTH-INIT-'.str_pad((string) $medicine->id, 4, '0', STR_PAD_LEFT),
                        'location' => 'Gudang Utama Farmasi',
                        'storage_location' => $medicine->storage_location,
                        'quantity' => $medicine->stock,
                        'initial_quantity' => $medicine->stock,
                        'unit_price' => 0,
                        'expired_at' => null,
                        'received_at' => $now->toDateString(),
                        'note' => 'Stok awal formularium (migrasi data)',
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }

                if ($rows !== []) {
                    DB::table('stock_batches')->insert($rows);
                }
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_batches');
    }
};
