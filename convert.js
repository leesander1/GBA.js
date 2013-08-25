// The ROM is interpreted as:
// ARM instructions (32-bit).
// THUMB instructions (16-bit).
// These arrays contain each opcode's function, params and assembler code. 
// ARM opcodes are conditional, their conditions are stored in a fourth array.
arm_opcode = [];
arm_params = [];
arm_asm = [];
arm_cond = [];

thumb_opcode = [];
thumb_params = [];
thumb_asm = [];

/** convertAll() **/
// For debug purpose only
// Convert all the ROM in ARM and THUMB instructions
function convert_all(){
  for(i = 0; i < m32[8].length; i++){
    convert_ARM(i);
  }
  for(i = 0; i < m16[8].length; i++){
    convert_THUMB(i);
  }
}

/** convertARM(a,t) **/
// Convert a 32-bit instruction to ARM and Assembler code.
// @param i: the instruction to convert (as an index of m32)
function convert_ARM(i){
  
  // Default ASM value: unknown.
  arm_asm[i] = "?";
  
  // Read the instruction.
  instr = m32[8][i];
  
  // Read the instruction's condition.
  cond = arm_cond[i] = bit(instr, 28, 31);
  condname = "";
  if(cond === 0) condname = "EQ";
  if(cond === 1) condname = "NE";
  if(cond === 2) condname = "CS";
  if(cond === 3) condname = "CC";
  if(cond === 4) condname = "MI";
  if(cond === 5) condname = "PL";
  if(cond === 6) condname = "VS";
  if(cond === 7) condname = "VC";
  if(cond === 8) condname = "HI";
  if(cond === 9) condname = "LS";
  if(cond === 0xA) condname = "GE";
  if(cond === 0xB) condname = "LT";
  if(cond === 0xC) condname = "GT";
  if(cond === 0xD) condname = "LE";
  if(cond === 0xF) condname = "NV";

  // ARM3 opcodes
  if(bit(instr, 8, 27) === 0x012FFF){
  
    // BX Rn
    arm_opcode[i] = arm_bx;
    arm_params[i] = [bit(instr, 0, 3)];
    arm_asm[i] = "BX" + condname + " r" + arm_params[i][0];
  }

  // ARM4 opcodes
  else if(bit(instr, 25, 27) === 0x5){
    opcode = bit(instr, 24);
    arm_params[i] = [0x8000000 + i * 4 + 8 + bit(instr, 0, 23) * 4];
    
    // BL address (if opcode = 1)
    if(opcode){
      arm_opcode[i] = arm_bl;
      arm_asm[i] = "BL";
    }
    
    // B address (if opcode = 0)
    else{
      arm_opcode[i] = arm_b;
      arm_asm[i] = "B";
    }
    
    arm_asm[i] += condname + " 0x" + hex(arm_params[i][0]);
    
    if(arm_params[i][0] < 0x8000000 + i * 4){
      arm_asm[i] += " ;&uarr;"
    }
    if(arm_params[i][0] > 0x8000000 + i * 4){
      arm_asm[i] += " ;&darr;"
    }
    if(arm_params[i][0] === 0x8000000 + i * 4){
      arm_asm[i] += " ;&larr;"
    }
  }

  // ARM9 opcodes
  // Bit fields:
  // i: bit(instr, 25),
  // p: bit(instr, 24),
  // u: bit(instr, 23),
  // b: bit(instr, 22),
  // rn: bit(instr, 16, 19),
  // rd: bit(instr, 12, 15),
  // wt: bit(instr, 21),
  // is: bit(instr, 7, 11),
  // st: bit(instr, 5, 6),
  // rm: bit(instr, 0, 3),
  // nn: bit(instr, 0, 11),
  // address: 0.
  else if(bit(instr, 26, 27) === 0x1){
    
    // LDR / STR Rd, Imm (if Rn = PC)
    if(bit(instr, 16, 19) === 15){
    
      // Params
      arm_params[i] = [bit(instr, 12, 15), mem(0x8000000 + i * 4 + 8 + bit(instr, 0, 11),4)];
      
      // LDR Rd, Imm (if L = 1)
      if(bit(instr, 20)){
        arm_opcode[i] = arm_ldr_ri;
        arm_asm[i] = "LDR";
      }
      
      // STR Rd, Imm (if L = 0)
      else{
        arm_opcode[i] = arm_str_ri;
        arm_asm[i] = "STR";
      }
      
      // Assembler
      arm_asm[i] += condname + " r" + arm_params[i][0] + ",=#0x" + hex(arm_params[i][1].toString(16));
    }
    
    // LDR / STR Rd, Rn, nn (if Rn != PC)
    else{
    
      // Params
      arm_params[i] = [bit(instr, 12, 15), bit(instr, 16, 19), bit(instr, 0, 11)];

      // LDR Rd, [Rn, nn] (if L = 1)
      if(bit(instr, 20)){
        arm_opcode[i] = arm_ldr_rrn;
        arm_asm[i] = "LDR";
      }
      
      // STR Rd, [Rn, nn] (if L = 0)
      else{
        arm_opcode[i] = arm_str_rrn;
        arm_asm[i] = "STR";
      }
      
      // Assembler
      arm_asm[i] += condname + " r" + arm_params[i][0] + ",[r" + arm_params[i][1] + ",0x" + hex(arm_params[i][2]) + "]";
    }
  }

  // ARM7 opcodes
  else if(bit(instr, 25, 27) === 0x0 && bit(instr, 7) === 0x0 && bit(instr, 12, 15) != 0xF){
    arm_opcode[i] = null;
    arm_params[i] = [];
    arm_asm[i] = "ARM7";
  }

  // ARM5/6 opcodes
  // Bit fields:
  // opcode5: bit(instr, 21, 24),
  // opcode6: bit(instr, 21),
  // i: bit(instr, 25),
  // s: bit(instr, 20),
  // rn: bit(instr, 16, 19),
  // rd: bit(instr, 12, 15),
  // is: bit(instr, 8, 11) * 2,
  // nn: bit(instr, 0, 7),
  // r: bit(instr, 4),
  // rs: bit(instr, 8, 11),
  // is: bit(instr, 7, 11),
  // st: bit(instr, 5, 6),
  // rm: bit(instr, 0, 3),
  // psr: bit(instr, 22),
  // f: bit(instr, 19),
  // s: bit(instr, 18),
  // x: bit(instr, 17),
  // c: bit(instr, 16),
  // imms: bit(instr, 8, 11),
  // imm: bit(instr, 0, 7).
  else{
  
    // Reset mask
    mask = 0;
    
    // ARM6 opcodes
    if(!bit(instr, 18) && bit(instr, 21, 24) >= 8 && bit(instr, 21, 24) <= 0xB){
      
      // allow to write on flags (bits 24-31) (if f = 1)
      if(bit(instr, 19) === 1){
        mask += 0xFF000000;
      }
      
      // allow to write on controls (bits 0-7) (if c = 1)
      if(bit(instr, 16) === 1){
        mask += 0xFF;
      }
      
      // MSR params
      arm_params[i] = [bit(instr, 0, 3), bit(instr, 19), bit(instr, 16), mask];
      
      // MSR spsr{f}{c}, op (if psr = 1)
      if(bit(instr, 22)){
        arm_opcode[i] = arm_msr_spsr;
        arm_asm[i] = "MSR" + condname + " spsr_" + (arm_params[i][1] ? "f" : "") + (arm_params[i][2] ? "c" : "") + ",r" + arm_params[i][0];
      }
      
      // MSR cpsr{f}{c}, op (if psr = 0)
      else{
        arm_opcode[i] = arm_msr_cpsr;
        arm_asm[i] = "MSR" + condname + " cpsr_" + (arm_params[i][1] ? "f" : "") + (arm_params[i][2] ? "c" : "") + ",r" + arm_params[i][0];
      }
    }

    // ARM5 opcodes
    else{
      
      // Reset Op2
      op2 = 0;
      
      // Compute Op2 (if I = 1)
      if(bit(instr, 25)){
        is = bit(instr, 8, 11) * 2;
        nn = bit(instr, 0, 7);
        op2 = ror(nn, 32, is);
      }
      
      // Opcodes
      switch(bit(instr, 21, 24)){
        case 0x0:
          break;
          
        case 0x1:
          break;
          
        case 0x2:
          break;
          
        case 0x3: 
          break;
          
        // ADD
        case 0x4:
        
          // ADD rd, Imm (if Rn = PC)
          if(bit(instr, 16, 19) === 15){
            arm_opcode[i] = arm_add_ri;
            arm_params[i] = [bit(instr, 12, 15), 0x8000000 + i * 4 + 8 + op2];
            arm_asm[i] = "ADD r" + arm_params[i][0] + ",=#0x" + hex(arm_params[i][1]);
          }
          
          // ADD Rd, Rn, Op2 (if Rn != PC)
          else{
            arm_opcode[i] = arm_add_rrn;
            arm_params[i] = [bit(instr, 12, 15), bit(instr, 16, 19), op2];
            arm_asm[i] = "ADD r" + arm_params[i][0] + ",r" + arm_params[i][1] + ",0x" + hex(arm_params[i][2]);
          }
          break;
          
        case 0x5:
          break;
          
        case 0x6:
          break;
          
        case 0x7:
          break;
          
        case 0x8:
          break;
          
        case 0x9:
          break;
          
        case 0xA:
          break;
          
        case 0xB:
          break;
          
        case 0xC:
          break;
          
        // MOV Rd, Op2
        case 0xD:
          arm_opcode[i] = arm_mov;
          arm_params[i] = [bit(instr, 12, 15), op2];
          arm_asm[i] = "MOV r" + arm_params[i][0] + ",0x" + hex(arm_params[i][1]);
          break;
          
        case 0xE:
          break;
          
        case 0xF:
          break;
      }
    }
  }
  
  if(debug && $("armvalue" + hex(0x8000000 + i * 4))){
    $("armvalue" + hex(0x8000000 + i * 4)).innerHTML = hex(m32[8][i], 8);
    $("armname" + hex(0x8000000 + i * 4)).innerHTML = arm_asm[i];
  }
}

function convert_THUMB(a){
  
/*
  // Extract THUMB opcodes
  for(i = 0; i < rom16.length; i++){
    instr = rom16[i];
    thumb[i] = [0, [0]];
    
    // Header
    if(i > 1 && i < 96){
      continue;
    }
    
    t = bit(instr, 8, 15);
    u = bit(instr, 10, 15);
    v = bit(instr, 11, 15);
    w = bit(instr, 12, 15);
    z = bit(instr, 13, 15);
    rd = bit(instr, 0, 2);
    rs = bit(instr, 3, 5);
    rb = bit(instr, 3, 5);
    offset6_10 = bit(instr, 6, 10);
    offset6_8 = bit(instr, 6, 8);
    offset0_7 = bit(instr, 0, 7);
    name = "?";

    // THUMB 1/2 instructions
    if(z === 0x0){
      opcode = bit(instr, 11, 12);
      if(opcode === 0x3){                                 // THUMB 2:
        opcode = bit(instr, 9, 10);
        if(opcode === 2 && !offset6_8){
          name = "MOV";
          thumb[i] =
          [
            thumb2_mov_rr,                                // MOV
            [
              rd,                                         // Rd
              rs                                          // Rs
            ]
          ]
        }
        else if(opcode === 0x0){
          name = "ADD";
          thumb[i] =
          [
            thumb_add_rrr,                                // ADD
            [
              rd,                                         // Rd
              rs,                                         // Rs
              bit(instr, 6, 8)                            // Rn
            ]
          ]
        }
        else if(opcode === 0x1){
          name = "SUB";
          thumb[i] =
          [
            thumb_sub_rrr,                                // SUB
            [
              rd,                                         // Rd
              rs,                                         // Rs
              bit(instr, 6, 8)                            // Rn
            ]
          ]
        }
        else if(opcode === 0x2){
          name = "ADD";
          thumb[i] =
          [
            thumb_add_rrn,                                // ADD
            [
              rd,                                         // Rd
              rs,                                         // Rs
              bit(instr, 6, 8)                            // nn
            ]
          ]
        }
        else if(opcode === 0x3){
          name = "SUB";
          thumb[i] =
          [
            thumb_sub_rrn,                                // SUB
            [
              rd,                                         // Rd
              rs,                                         // Rs
              bit(instr, 6, 8)                            // nn
            ]
          ]
        }
      }
      else{                                               // THUMB 1
        if(opcode === 0x0){
          name = "LSL";
          thumb[i] =
          [
            thumb_lsl_rrn,                                // LSL
            [
              rd,                                         // Rd
              rs,                                         // Rs
              offset6_10                                  // Offset
            ]
          ]
        }
        else if(opcode === 0x1){
          if(offset6_10 === 0){
            offset6_10 = 32;
          }
          name = "LSR";
          thumb[i] =
          [
            thumb_lsr,                                    // LSR
            [
              rd,                                         // Rd
              rs,                                         // Rs
              offset6_10                                  // Offset
            ]
          ]
        }
        else if(opcode === 0x2){
          if(offset6_10 === 0){
            offset6_10 = 32;
          }
          name = "ASR";
          thumb[i] =
          [
            thumb_asr,                                    // ASR
            [
              rd,                                         // Rd
              rs,                                         // Rs
              offset6_10                                  // Offset
            ]
          ]
        }
      }
    }

    // THUMB 3 instructions
    else if(z === 0x1){
      opcode = bit(instr, 11, 12);
      if(opcode === 0){
        name = "MOV";
        thumb[i] =
        [
          thumb_mov_rn,                                   // MOV
          [
            bit(instr, 8, 10),                            // Rd
            offset0_7                                     // nn
          ]
        ]
      }
      else if(opcode === 1){
        name = "CMP";
        thumb[i] =
        [
          thumb_cmp_rn,                                   // CMP
          [
            bit(instr, 8, 10),                            // Rd
            offset0_7                                     // nn
          ]
        ]
      }
      else if(opcode === 2){
        name = "ADD";
        thumb[i] =
        [
          thumb_add_rn,                                   // ADD
          [
            bit(instr, 8, 10),                            // Rd
            offset0_7                                     // nn
          ]
        ]
      }
      else if(opcode === 3){
        name = "SUB";
        thumb[i] =
        [
          thumb_sub_rn,                                   // SUB
          [
            bit(instr, 8, 10),                            // Rd
            offset0_7                                     // nn
          ]
        ]
      }
    }

    // THUMB 4 instructions
    else if(u === 0x10){
      opcode = bit(instr, 6, 9);
      if(opcode === 0x0){
        name = "AND";
        thumb[j] =
        [
          thumb_and_rr,                                   // AND
          [
            rd,                                           // Rd
            rs                                            // Rs
          ]
        ]
      }
      if(opcode === 0x8){
        name = "TST";
        thumb[j] =
        [
          thumb_tst_rr,                                   // TST
          [
            rd,                                           // Rd
            rs                                            // Rs
          ]
        ]
      }
      if(opcode === 0x9){
        name = "NEG";
        thumb[i] =
        [
          thumb_neg_rr,                                   // NEG
          [
            rd,                                           // Rd
            rs                                            // Rs
          ]
        ]
      }
      if(opcode === 0xA){
        name = "CMP";
        thumb[i] =
        [
          thumb_cmp_rr,                                   // CMP
          [
            rd,                                           // Rd
            rs                                            // Rs
          ]
        ]
      }
      if(opcode === 0xC){
        name = "ORR";
        thumb[i] =
        [
          thumb_orr,                                      // ORR
          [
            rd,                                           // Rd
            rs                                            // Rs
          ]
        ]
      }
      if(opcode === 0xD){
        name = "MUL";
        thumb[i] =
        [
          thumb_mul,                                      // MUL
          [
            rd,                                           // Rd
            rs                                            // Rs
          ]
        ]
      }
      if(opcode === 0xE){
        name = "BIC";
        thumb[i] =
        [
          thumb_bic,                                      // BIC
          [
            rd,                                           // Rd
            rs                                            // Rs
          ]
        ]
      }
    }

    // THUMB 5 instructions
    else if(u === 0x11){
      rd = lshift(bit(instr, 7), 3) + rd;
      rs = lshift(bit(instr, 6), 3) + rs;
      opcode = bit(instr, 8, 9);
      if(opcode === 0){
        name = "ADD";
        thumb[i] =
        [
          thumb_add_rr,                                   // ADD
          [
            rd,                                           // Rd
            rs                                            // Rs
          ]
        ]
      }
      else if(opcode === 2){
        if(rd === 8 && rs === 8){
          name = "NOP";
          thumb[i] =
          [
            thumb_nop,                                    // NOP
            [
            ]
          ]
        }
        else{
          name = "MOV";
          thumb[i] =
          [
            thumb5_mov_rr,                                // MOV
            [
              rd,                                         // Rd
              rs                                          // Rs
            ]
          ]
        }
      }
      else if(opcode === 3){
        if(bit(instr, 7) === 0){
          name = "BX";
          thumb[i] =
          [
            thumb_bx,                                     // BX
            [
              rs                                          // Rs
            ]
          ]
        }
      }
    }

    // THUMB 6 instructions
    else if(v === 0x9){
      name = "LDR";
      thumb[i] =
      [
        thumb_ldr_rn,                                     // LDR
        [
          bit(instr, 8, 10),                              // Rd
          mem(                                            // WORD[PC + nn * 4]
            ((0x8000000 + i + 4) & 0xFFFFFFFC)
            +
            offset0_7 * 4,
            4
          )
        ]
      ]
    }

    // THUMB 7/8 instructions
    else if(w === 0x5){
      opcode = bit(instr, 10, 11);
      if(bit(instr, 9) === 1){                            // THUMB 8:
        if(opcode === 0){
          name = "STRH";
          thumb[i] =
          [
            thumb_strh_rrr,                               // STRH
            [
              rd,                                         // Rd
              rb,                                         // Rb
              offset6_8                                   // Ro
            ]
          ]
        }
        else if(opcode === 1){
        
        }
        else if(opcode === 2){
        
        }
        else if(opcode === 3){
          
        }
      }
      else{                                               // THUMB 7:
        if(opcode === 0){
          name = "STR";
          thumb[i] =
          [
            thumb_str_rrr,                                // STR
            [
              rd,                                         // Rd
              rb,                                         // Rb
              offset6_8                                   // Ro
            ]
          ]
        }
        else if(opcode === 1){
        
        }
        else if(opcode === 2){
        
        }
        else if(opcode === 3){
          name = "LDRB";
          thumb[i] =
          [
            thumb_ldrb_rrr,                               // LDRB
            [
              rd,                                         // Rd
              rb,                                         // Rb
              offset6_8                                   // Ro
            ]
          ]
        }
      }
      
    }

    // THUMB 9 instructions
    else if(z === 0x3){
      opcode = bit(instr, 11, 12);
      if(opcode === 0){
        name = "STR";
        thumb[i] =
        [
          thumb_str_rrn,                                  // STR
          [
            rd,                                           // Rd
            rb,                                           // Rb
            offset6_10 * 4                                // nn
          ]
        ]
      }
      else if(opcode === 1){
        name = "LDR";
        thumb[i] =
        [
          thumb_ldr_rrn,                                  // LDR
          [
            rd,                                           // Rd
            rb,                                           // Rb
            offset6_10 * 4                                // nn
          ]
        ]
      }
      else if(opcode === 2){
        name = "STRB";
        thumb[i] =
        [
          thumb_strb_rrn,                                 // STRB
          [
            rd,                                           // Rd
            rb,                                           // Rb
            offset6_10                                    // nn
          ]
        ]
      }
      else if(opcode === 3){
        name = "LDRB";
        thumb[i] =
        [
          thumb_ldrb_rrn,                                 // LDRB
          [
            rd,                                           // Rd
            rb,                                           // Rb
            offset6_10                                    // nn
          ]
        ]
      }
    }

    // THUMB 10 instructions
    else if(w === 0x8){
      opcode = bit(instr, 11);
      if(opcode === 0){
        name = "STRH";
        thumb[i] =
        [
          thumb_strh_rrn,                                 // STRH
          [
            rd,                                           // Rd
            rb,                                           // Rb
            offset6_10                                    // nn
          ]
        ]
      }
      else if(opcode === 1){
        name = "LDRH";
        thumb[i] =
        [
          thumb_ldrh_rrn,                                 // LDRH
          [
            rd,                                           // Rd
            rb,                                           // Rb
            offset6_10                                    // nn
          ]
        ]
      }
    }

    // THUMB 11 instructions
    else if(w === 0x9){
      rd = bit(instr, 8, 10);
      if(bit(instr, 11) === 1){
        name = "LDR";
        thumb[i] =
        [
          thumb_ldr_spn,                                  // LDR
          [
            rd,                                           // Rd
            offset0_7 * 4                                 // nn
          ]
        ]
      }
      else{
        name = "STR";
        thumb[i] =
        [
          thumb_str_spn,                                  // STR
          [
            rd,                                           // Rd
            offset0_7 * 4                                 // nn
          ]
        ]
      }
    }

    // THUMB 12 instructions
    else if(w === 0xA){

    }

    // THUMB 13 instructions
    else if(t === 0xB0){
      nn = bit(instr, 0, 6) * 4;
      if(bit(instr, 7) === 1){
        nn = -nn;
      }
      name = "ADD";
      thumb[i] =
      [
        thumb_add_spn,                                    // ADD
        [
          nn                                              // nn
        ]
      ]
    }

    // THUMB 17 BKPT instruction
    else if(t === 0xBE){

    }

    // THUMB 14 instructions
    else if(w === 0xB){
      opcode = bit(instr, 11);
      if(opcode === 0){
        name = "PUSH";
        thumb[i] =
        [
          thumb_push,                                     // PUSH
          [
            bit(instr, 0, 7),                             // Rlist
            bit(instr, 8)                                 // LR
          ]
        ]
      }
      else{
        name = "POP";
        thumb[i] =
        [
          thumb_pop,                                      // POP
          [
            bit(instr, 0, 7),                             // Rlist
            bit(instr, 8)                                 // PC
          ]
        ]
      }
    }

    // THUMB 15 instructions
    else if(w === 0xC){
      opcode = bit(instr, 11);
      if(opcode === 0){
        name = "STMIA";
        thumb[i] =
        [
          thumb_stmia,                                    // STMIA
          [
            bit(instr, 8, 10),                            // Rb
            bit(instr, 0, 7)                              // Rlist
          ]
        ]
      }
      else if(opcode === 1){
        name = "LDMIA";
        thumb[i] =
        [
          thumb_ldmia,                                    // LDMIA
          [
            bit(instr, 8, 10),                            // Rb
            bit(instr, 0, 7)                              // Rlist
          ]
        ]
      }
    }

    // THUMB 17 SWI instruction
    else if(t === 0xDF){

    }

    // THUMB 16/18 instructions
    else if(w === 0xD || v === 0x1C){

      if(v === 0x1C){                                      // THUMB 18:
        name = "B"; f = thumb_b;
      }
      else{                                               // THUMB 16:
        cond = bit(instr, 8, 11);
        switch(cond){
          case 0: name = "BEQ"; f = thumb_beq; break;
          case 1: name = "BNE"; f = thumb_bne; break;
          case 2: name = "BCS"; f = thumb_bcs; break;
          case 3: name = "BCC"; f = thumb_bcc; break;
          case 4: name = "BMI"; f = thumb_bmi; break;
          case 5: name = "BPL"; f = thumb_bpl; break;
          case 6: name = "BVS"; f = thumb_bvs; break;
          case 7: name = "BVC"; f = thumb_bvc; break;
          case 8: name = "BHI"; f = thumb_bhi; break;
          case 9: name = "BLS"; f = thumb_bls; break;
          case 0xA: name = "BGE"; f = thumb_bge; break;
          case 0xB: name = "BLT"; f = thumb_blt; break;
          case 0xC: name = "BGT"; f = thumb_bgt; break;
          case 0xD: name = "BLE"; f = thumb_ble; break;
        }
      }

      offset0_7 *= 2;
      if(offset0_7 > 254){
        offset0_7 -= 512;
      }

      thumb[i] =
      [
        f,                                                // B{cond}
        [
          0x8000000 + i + 4 + offset0_7                   // address
        ]
      ]
    }

    // THUMB 19 instruction
    else if(v === 0x1E){
      instr2 = mem(0x8000000 + i + 2, 2);
      opcode = bit(instr2, 11, 15);
      address = lshift(bit(instr, 0, 10), 12) +  lshift(bit(instr2, 0, 10), 1);
      if(address > 0x400000){
        address -= 0x800000;
      }
      if(opcode === 0x1F){
        name = "BL";
        thumb[i] =
        [
          thumb_bl,                                       // BL
          [
            0x8000000 + i + 4 + address,                  // address
            (0x8000000 + i + 4) | 1                       // link
          ]
        ];
      }
    }
    if(thumb[i]) thumb[i].push(name);
  }
*/
}
