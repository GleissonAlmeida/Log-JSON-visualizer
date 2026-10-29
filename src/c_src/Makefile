# Makefile para compilar o leitor de logs JSON e plotador em Linguagem C
CC = gcc
CFLAGS = -Wall -Wextra -O2 -std=c99
LDFLAGS = -lm

TARGET = log_plotter
SRCS = main.c json_parser.c
OBJS = $(SRCS:.c=.o)

all: $(TARGET)

$(TARGET): $(OBJS)
	$(CC) $(OBJS) -o $(TARGET) $(LDFLAGS)
	@echo "=================================================="
	@echo "Compilacao concluida com sucesso!"
	@echo "Execute com: ./$(TARGET) sample_iot.json"
	@echo "=================================================="

%.o: %.c json_parser.h chart_js_embedded.h
	$(CC) $(CFLAGS) -c $< -o $@

clean:
	rm -f $(OBJS) $(TARGET) $(TARGET).exe grafico_c.html grafico_c.dat grafico_c.gp

run: $(TARGET)
	./$(TARGET) sample_iot.json

windows:
	x86_64-w64-mingw32-gcc -Wall -Wextra -O2 -std=c99 -static main.c json_parser.c -lm -o log_plotter.exe
	@echo "=================================================="
	@echo "Compilacao Windows 64-bit concluida com sucesso!"
	@echo "Executavel gerado: log_plotter.exe"
	@echo "=================================================="

.PHONY: all clean run windows
